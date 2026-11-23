import { Router } from 'express'
import { z } from 'zod'
import { ContentItem, Deposit, EmailVerification, InvestmentPlan, LedgerEntry, PlanApplication, PlanPosition, PlatformSettings, SupportMessage, Transfer, User, Wallet, Withdrawal } from '../models.js'
import { asyncRoute, requireAuth } from '../middleware.js'
import { asRupees, ledger, toPaise, walletFor, withTransaction } from '../transactions.js'
import { safeUser } from '../security.js'

const router = Router()
const mobileSchema = z.string().regex(/^\d{10}$/)
const idempotencySchema = z.string().trim().regex(/^[A-Za-z0-9._:-]{8,128}$/)
const amountError = { error: 'Enter an amount in rupees with up to two decimal places.' }

function getRequestKey(req, res) {
  const parsed = idempotencySchema.safeParse(req.get('Idempotency-Key') || '')
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid Idempotency-Key is required. Retry with the same key if the request times out.' })
    return null
  }
  return parsed.data
}

function publicPlan(plan) {
  return { id: plan._id.toString(), name: plan.name, slug: plan.slug, category: plan.category, summary: plan.summary, details: plan.details, minimumPaise: plan.minimumPaise, minimum: asRupees(plan.minimumPaise), riskLabel: plan.riskLabel, termsUrl: plan.termsUrl, imageUrl: plan.imageUrl || '' }
}

router.get('/settings', asyncRoute(async (_req, res) => {
  const settings = await PlatformSettings.findOne({ key: 'main' }).lean()
  res.json({
    paymentMethods: (settings?.paymentMethods || []).filter((method) => method.active).map(({ key, label, instructions }) => ({ key, label, instructions })),
    languages: settings?.languages?.length ? settings.languages : ['en'],
    themes: settings?.themeIds?.length ? settings.themeIds : ['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy'],
  })
}))

router.get('/plans', asyncRoute(async (_req, res) => {
  const plans = await InvestmentPlan.find({ isActive: true }).sort({ createdAt: 1 }).lean()
  res.json({ plans: plans.map(publicPlan) })
}))

router.get('/plans/:slug', asyncRoute(async (req, res) => {
  const plan = await InvestmentPlan.findOne({ slug: req.params.slug, isActive: true }).lean()
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
  const prior = await Withdrawal.findOne({ userId: req.user._id, requestKey })
  if (prior) return res.json({ withdrawal: prior, replayed: true })
  if (req.user.profileStatus !== 'verified') return res.status(403).json({ error: 'Profile verification is required before requesting a withdrawal.' })
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
  if (amountPaise < plan.minimumPaise) return res.status(400).json({ error: `The minimum amount for this plan is ₹${asRupees(plan.minimumPaise).toLocaleString('en-IN')}.` })
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
