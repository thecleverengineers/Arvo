import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { ContentItem, Deposit, EmailVerification, InvestmentPlan, LedgerEntry, OtpChallenge, PlanApplication, PlanPosition, PlatformSettings, SupportMessage, Transfer, User, Wallet, Withdrawal } from '../models.js'
import { asyncRoute, requireAuth } from '../middleware.js'
import { asRupees, ledger, toPaise, walletFor, withTransaction } from '../transactions.js'
import { hashMpin, safeUser, verifyMpin } from '../security.js'
import { isDemoAuth, sendOtp, verifyOtp } from '../fast2sms.js'

const router = Router()
const mobileSchema = z.string().regex(/^\d{10}$/)
const idempotencySchema = z.string().trim().regex(/^[A-Za-z0-9._:-]{8,128}$/)
const amountError = { error: 'Enter an amount in rupees with up to two decimal places.' }
const mpinLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many MPIN verification attempts. Try again later.' } })

function getRequestKey(req, res) {
  const parsed = idempotencySchema.safeParse(req.get('Idempotency-Key') || '')
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid Idempotency-Key is required. Retry with the same key if the request times out.' })
    return null
  }
  return parsed.data
}

function publicPlan(plan) {
  return { id: plan._id.toString(), name: plan.name, slug: plan.slug, category: plan.category, summary: plan.summary, details: plan.details, pricePaise: plan.pricePaise || null, price: plan.pricePaise ? asRupees(plan.pricePaise) : null, cycle: plan.cycle || 'monthly', durationDays: plan.durationDays || 30, investmentRoiPct: plan.investmentRoiPct ?? 0, profitReturnPaise: plan.profitReturnPaise || 0, profitReturn: asRupees(plan.profitReturnPaise || 0), riskLabel: plan.riskLabel, termsUrl: plan.termsUrl, imageUrl: plan.imageUrl || '' }
}

router.get('/settings', asyncRoute(async (_req, res) => {
  const settings = await PlatformSettings.findOne({ key: 'main' }).lean()
  res.set('Cache-Control', 'no-store')
  res.json({
    paymentMethods: (settings?.paymentMethods || []).filter((method) => method.active).map(({ key, label, instructions }) => ({ key, label, instructions })),
    languages: settings?.languages?.length ? settings.languages : ['en'],
    themes: settings?.themeIds?.length ? settings.themeIds : ['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy'],
    activeTheme: ['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy'].includes(settings?.activeTheme) ? settings.activeTheme : 'emerald',
  })
}))

router.get('/plans', asyncRoute(async (_req, res) => {
  const plans = await InvestmentPlan.find({ isActive: true, pricePaise: { $gt: 0 } }).sort({ createdAt: 1 }).lean()
  res.json({ plans: plans.map(publicPlan) })
}))

router.get('/plans/:slug', asyncRoute(async (req, res) => {
  const plan = await InvestmentPlan.findOne({ slug: req.params.slug, isActive: true, pricePaise: { $gt: 0 } }).lean()
  if (!plan) return res.status(404).json({ error: 'Plan not found.' })
  res.json({ plan: publicPlan(plan) })
}))

router.get('/content/:type', asyncRoute(async (req, res) => {
  const allowed = ['news', 'banner', 'work_area', 'about', 'service', 'investor', 'partner', 'social', 'menu', 'logo', 'icon']
  if (!allowed.includes(req.params.type)) return res.status(404).json({ error: 'Content type not found.' })
  const language = String(req.query.language || 'en').trim().toLowerCase().slice(0, 12)
  const items = await ContentItem.find({ type: req.params.type, isPublished: true, language }).sort({ sortOrder: 1, createdAt: -1 }).lean()
  res.json({ items })
}))

router.get('/profile', requireAuth, asyncRoute(async (req, res) => res.json({ user: safeUser(req.user) })))

router.post('/profile/mpin/otp', requireAuth, mpinLimiter, asyncRoute(async (req, res) => {
  if (req.user.profileStatus !== 'verified') return res.status(403).json({ error: 'Complete profile verification before creating a withdrawal MPIN.' })
  const intent = req.user.mpinHash ? 'mpin_reset' : 'mpin_setup'
  const mobile = req.user.mobile
  const now = new Date()
  const lastMinute = new Date(now.getTime() - 60_000)
  const hourAgo = new Date(now.getTime() - 60 * 60_000)
  const latest = await OtpChallenge.findOne({ mobile, intent: { $in: ['mpin_setup', 'mpin_reset'] }, createdAt: { $gte: hourAgo } }).sort({ createdAt: -1 })
  if (latest?.createdAt > lastMinute) return res.status(429).json({ error: 'Wait a minute before requesting another code.' })
  const recentCount = await OtpChallenge.countDocuments({ mobile, createdAt: { $gte: hourAgo } })
  if (recentCount >= 5) return res.status(429).json({ error: 'OTP request limit reached for this number. Try again later.' })
  const mode = isDemoAuth() ? 'demo' : 'fast2sms'
  await sendOtp(mobile)
  const expiresAt = new Date(now.getTime() + Number(process.env.FAST2SMS_OTP_EXPIRY_MINUTES || 10) * 60_000)
  await OtpChallenge.updateMany({ mobile, intent: { $in: ['mpin_setup', 'mpin_reset'] }, status: 'pending' }, { $set: { status: 'expired' } })
  await OtpChallenge.create({ mobile, intent, mode, sentAt: now, expiresAt })
  res.json({ ok: true, expiresInSeconds: Number(process.env.FAST2SMS_OTP_EXPIRY_MINUTES || 10) * 60, demoOtp: mode === 'demo' ? (process.env.DEMO_OTP || '246810') : undefined })
}))

router.post('/profile/mpin', requireAuth, mpinLimiter, asyncRoute(async (req, res) => {
  if (req.user.profileStatus !== 'verified') return res.status(403).json({ error: 'Complete profile verification before creating a withdrawal MPIN.' })
  const parsed = z.object({ otp: z.string().trim().regex(/^\d{4,10}$/), mpin: z.string().regex(/^\d{6}$/) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter the OTP and a six-digit MPIN.' })
  const intent = req.user.mpinHash ? 'mpin_reset' : 'mpin_setup'
  const challenge = await OtpChallenge.findOne({ mobile: req.user.mobile, intent, status: 'pending' }).sort({ createdAt: -1 })
  if (!challenge || challenge.expiresAt < new Date()) return res.status(400).json({ error: 'This OTP has expired. Request a new code.' })
  if (challenge.attempts >= 5) return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' })
  challenge.attempts += 1
  await challenge.save()
  let verified = false
  try { verified = await verifyOtp(req.user.mobile, parsed.data.otp) }
  catch (error) { return res.status(error.status || 502).json({ error: error.message || 'OTP verification failed.' }) }
  if (!verified) return res.status(400).json({ error: 'The OTP is incorrect or expired.' })
  const claimed = await OtpChallenge.findOneAndUpdate({ _id: challenge._id, status: 'pending' }, { $set: { status: 'verified' } }, { new: true })
  if (!claimed) return res.status(409).json({ error: 'This OTP was already used. Request a new code.' })
  req.user.mpinHash = await hashMpin(parsed.data.mpin)
  await req.user.save()
  res.json({ ok: true, user: safeUser(req.user), message: 'Withdrawal MPIN saved securely.' })
}))

router.patch('/profile', requireAuth, asyncRoute(async (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254).optional().or(z.literal('')) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const emailChanged = parsed.data.email && parsed.data.email !== req.user.email
  if (emailChanged) await EmailVerification.deleteMany({ userId: req.user._id })
  req.user.name = parsed.data.name
  req.user.email = parsed.data.email || ''
  if (emailChanged) req.user.emailVerifiedAt = null
  await req.user.save()
  res.json({ user: safeUser(req.user) })
}))

router.post('/profile/verification', requireAuth, asyncRoute(async (req, res) => {
  if (!req.user.name || !req.user.email || !req.user.emailVerifiedAt) return res.status(400).json({ error: 'Add your name and verify your email before submitting profile verification.' })
  if (req.user.profileStatus === 'pending' || req.user.profileStatus === 'verified') return res.status(409).json({ error: 'Your profile verification is already in progress or complete.' })
  req.user.profileStatus = 'pending'
  await req.user.save()
  res.json({ user: safeUser(req.user), message: 'Your profile is queued for administrator review.' })
}))

router.get('/wallet', requireAuth, asyncRoute(async (req, res) => {
  const wallet = await Wallet.findOne({ userId: req.user._id })
  if (!wallet) return res.status(404).json({ error: 'Wallet was not initialized.' })
  const [transactions, deposits, withdrawals, positions, planApplications] = await Promise.all([
    LedgerEntry.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30).lean(),
    Deposit.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    Withdrawal.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    PlanPosition.find({ userId: req.user._id, status: 'active' }).populate('planId', 'name').lean(),
    PlanApplication.find({ userId: req.user._id }).populate('planId', 'name').sort({ createdAt: -1 }).limit(20).lean(),
  ])
  res.json({
    wallet: { availablePaise: wallet.availablePaise, investedPaise: wallet.investedPaise, reservedPaise: wallet.reservedPaise, available: asRupees(wallet.availablePaise), invested: asRupees(wallet.investedPaise), reserved: asRupees(wallet.reservedPaise) },
    transactions,
    deposits,
    withdrawals,
    planApplications: planApplications.map((application) => ({ ...application, planName: application.planId?.name || 'Investment plan' })),
    positions: positions.map((position) => ({ id: position._id, plan: position.planId?.name || 'Investment plan', amountPaise: position.amountPaise, amount: asRupees(position.amountPaise), startedAt: position.startedAt })),
  })
}))

router.post('/deposits', requireAuth, asyncRoute(async (req, res) => {
  const requestKey = getRequestKey(req, res)
  if (!requestKey) return
  const prior = await Deposit.findOne({ userId: req.user._id, requestKey })
  if (prior) return res.json({ deposit: prior, replayed: true })
  const amountPaise = toPaise(req.body?.amount)
  if (!amountPaise) return res.status(400).json(amountError)
  const methodKey = String(req.body?.methodKey || '').trim().slice(0, 60)
  const paymentReference = String(req.body?.paymentReference || '').trim().slice(0, 120)
  if (!methodKey || paymentReference.length < 6) return res.status(400).json({ error: 'Choose a deposit method and enter its payment reference.' })
  const settings = await PlatformSettings.findOne({ key: 'main' }).lean()
  const method = settings?.paymentMethods?.find((item) => item.key === methodKey && item.active)
  if (!method) return res.status(400).json({ error: 'That deposit method is currently unavailable.' })
  if (amountPaise > 1000000000) return res.status(400).json({ error: 'Deposit request exceeds the current request limit.' })
  const deposit = await Deposit.create({ userId: req.user._id, requestKey, amountPaise, methodKey, paymentReference })
  res.status(201).json({ deposit })
}))

router.post('/withdrawals', requireAuth, asyncRoute(async (req, res) => {
  const requestKey = getRequestKey(req, res)
  if (!requestKey) return
  if (req.user.profileStatus !== 'verified') return res.status(403).json({ error: 'Profile verification is required before requesting a withdrawal.' })
  if (!req.user.mpinHash) return res.status(409).json({ error: 'Create a withdrawal MPIN from your verified profile before requesting a withdrawal.' })
  const mpin = String(req.body?.mpin || '').trim()
  if (!/^\d{6}$/.test(mpin)) return res.status(400).json({ error: 'Enter your six-digit withdrawal MPIN.' })
  if (!await verifyMpin(req.user.mpinHash, mpin)) return res.status(401).json({ error: 'The withdrawal MPIN is incorrect.' })
  const prior = await Withdrawal.findOne({ userId: req.user._id, requestKey })
  if (prior) return res.json({ withdrawal: prior, replayed: true })
  const amountPaise = toPaise(req.body?.amount)
  if (!amountPaise) return res.status(400).json(amountError)
  const payoutNote = String(req.body?.payoutNote || '').trim().slice(0, 300)
  const withdrawal = await withTransaction(async (session) => {
    const priorInTransaction = await Withdrawal.findOne({ userId: req.user._id, requestKey }).session(session)
    if (priorInTransaction) return priorInTransaction
    const wallet = await walletFor(req.user._id, session)
    if (wallet.availablePaise < amountPaise) {
      const error = new Error('Your available wallet balance is too low for this withdrawal.')
      error.status = 400
      throw error
    }
    wallet.availablePaise -= amountPaise
    wallet.reservedPaise += amountPaise
    await wallet.save({ session })
    const [created] = await Withdrawal.create([{ userId: req.user._id, requestKey, amountPaise, payoutNote }], { session })
    await ledger(session, { userId: req.user._id, kind: 'withdrawal_hold', direction: 'debit', amountPaise, status: 'reserved', referenceType: 'withdrawal', referenceId: created._id, description: 'Withdrawal request reserved' })
    return created
  })
  res.status(201).json({ withdrawal })
}))

router.post('/transfers', requireAuth, asyncRoute(async (req, res) => {
  const requestKey = getRequestKey(req, res)
  if (!requestKey) return
  const prior = await Transfer.findOne({ fromUserId: req.user._id, requestKey })
  if (prior) return res.json({ transfer: prior, replayed: true })
  const recipientMobile = String(req.body?.recipientMobile || '').replace(/\D/g, '')
  if (!mobileSchema.safeParse(recipientMobile).success) return res.status(400).json({ error: 'Enter the recipient’s 10-digit mobile number.' })
  const amountPaise = toPaise(req.body?.amount)
  if (!amountPaise) return res.status(400).json(amountError)
  const note = String(req.body?.note || '').trim().slice(0, 160)
  const recipient = await User.findOne({ mobile: recipientMobile, status: 'active' })
  if (!recipient) return res.status(404).json({ error: 'No active Arvo account was found for that mobile number.' })
  if (recipient._id.equals(req.user._id)) return res.status(400).json({ error: 'You cannot transfer funds to your own account.' })
  const transfer = await withTransaction(async (session) => {
    const priorInTransaction = await Transfer.findOne({ fromUserId: req.user._id, requestKey }).session(session)
    if (priorInTransaction) return priorInTransaction
    const senderWallet = await walletFor(req.user._id, session)
    const recipientWallet = await walletFor(recipient._id, session)
    if (senderWallet.availablePaise < amountPaise) {
      const error = new Error('Your available wallet balance is too low for this transfer.')
      error.status = 400
      throw error
    }
    senderWallet.availablePaise -= amountPaise
    recipientWallet.availablePaise += amountPaise
    await senderWallet.save({ session })
    await recipientWallet.save({ session })
    const [created] = await Transfer.create([{ fromUserId: req.user._id, toUserId: recipient._id, requestKey, amountPaise, note }], { session })
    await ledger(session, { userId: req.user._id, kind: 'transfer_out', direction: 'debit', amountPaise, referenceType: 'transfer', referenceId: created._id, description: `Transfer to ${recipient.mobile}` })
    await ledger(session, { userId: recipient._id, kind: 'transfer_in', direction: 'credit', amountPaise, referenceType: 'transfer', referenceId: created._id, description: `Transfer from ${req.user.mobile}` })
    return created
  })
  res.status(201).json({ transfer })
}))

router.post('/plans/:id/apply', requireAuth, asyncRoute(async (req, res) => {
  const requestKey = getRequestKey(req, res)
  if (!requestKey) return
  const prior = await PlanApplication.findOne({ userId: req.user._id, requestKey })
  if (prior) return res.json({ application: prior, replayed: true })
  const plan = await InvestmentPlan.findOne({ _id: req.params.id, isActive: true })
  if (!plan) return res.status(404).json({ error: 'Plan not found or inactive.' })
  const amountPaise = toPaise(req.body?.amount)
  if (!amountPaise) return res.status(400).json(amountError)
  if (!plan.pricePaise) return res.status(409).json({ error: 'This plan does not have a price yet.' })
  if (amountPaise !== plan.pricePaise) return res.status(400).json({ error: `This plan has a fixed price of ₹${asRupees(plan.pricePaise).toLocaleString('en-IN')}.` })
  const application = await PlanApplication.create({ userId: req.user._id, planId: plan._id, requestKey, amountPaise })
  res.status(201).json({ application })
}))

router.get('/referrals', requireAuth, asyncRoute(async (req, res) => {
  const levels = []
  let codes = [req.user.referralCode]
  for (let level = 1; level <= 3; level += 1) {
    const filter = { referredBy: { $in: codes }, status: 'active' }
    const [count, nextCodes] = await Promise.all([User.countDocuments(filter), User.distinct('referralCode', filter)])
    levels.push({ level, count, members: [] })
    codes = nextCodes
    if (!codes.length) break
  }
  while (levels.length < 3) levels.push({ level: levels.length + 1, count: 0, members: [] })
  res.json({ referralCode: req.user.referralCode, levels, totalMembers: levels.reduce((sum, item) => sum + item.count, 0), rewardsEnabled: false })
}))

router.get('/support/messages', requireAuth, asyncRoute(async (req, res) => {
  const messages = await SupportMessage.find({ userId: req.user._id }).sort({ createdAt: 1 }).limit(200).lean()
  await SupportMessage.updateMany({ userId: req.user._id, senderRole: 'admin', readAt: null }, { $set: { readAt: new Date() } })
  res.json({ messages })
}))

router.post('/support/messages', requireAuth, asyncRoute(async (req, res) => {
  const parsed = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const message = await SupportMessage.create({ userId: req.user._id, senderRole: 'user', body: parsed.data.body })
  res.status(201).json({ message })
}))

export default router
