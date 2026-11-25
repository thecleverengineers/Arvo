import { Router } from 'express'
import { z } from 'zod'
import { AuditLog, ContentItem, Deposit, InvestmentPlan, LedgerEntry, PlanApplication, PlanPosition, PlanRelease, PlatformSettings, RewardClaim, SupportMessage, User, Wallet, Withdrawal } from '../models.js'
import { asyncRoute, requireAdmin, requireAuth } from '../middleware.js'
import { asRupees, audit, ledger, toPaise, walletFor, withTransaction } from '../transactions.js'
import { safeUser } from '../security.js'
import { queueReferralRewards, queueWelcomeReward } from '../rewards.js'

const router = Router()
router.use(requireAuth, requireAdmin)

const planInput = z.object({
  name: z.string().trim().min(3).max(90),
  slug: z.string().trim().min(3).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().max(50).default('Investment plan'),
  summary: z.string().trim().max(500).default(''),
  details: z.string().trim().max(10000).default(''),
  price: z.union([z.number(), z.string()]).nullable().optional(),
  cycle: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time']).default('monthly'),
  durationDays: z.coerce.number().int().min(1).max(36500).default(30),
  purchaseLimit: z.coerce.number().int().min(1).max(1000).default(2),
  investmentRoiPct: z.coerce.number().min(0).max(10000).default(0),
  dailyProfit: z.union([z.number(), z.string()]).default(0),
  riskLabel: z.string().trim().max(80).default('See plan documents'),
  termsUrl: z.string().trim().max(1000).default(''),
  imageUrl: z.string().max(600_000).default(''),
  comingSoon: z.boolean().default(false),
  isActive: z.boolean().default(true),
})


function parsePlan(body, { requirePrice = false } = {}) {
  const parsed = planInput.safeParse(body)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { price, dailyProfit, ...planData } = parsed.data
  let pricePaise
  const dailyProfitPaise = Number(dailyProfit) === 0 ? 0 : toPaise(dailyProfit)
  if (dailyProfitPaise === null || dailyProfitPaise < 0) return { error: 'Enter a valid non-negative daily profit in USDT.' }
  const profitReturnPaise = dailyProfitPaise * planData.durationDays
  if (!Number.isSafeInteger(profitReturnPaise) || profitReturnPaise > 1_000_000_000_000) return { error: 'Calculated total profit is too large.' }
  if (price !== undefined && price !== null) {
    pricePaise = toPaise(price)
    if (!pricePaise) return { error: 'Enter a valid fixed investment amount in USDT.' }
  } else if (requirePrice) {
    return { error: 'Enter a valid fixed investment amount in USDT.' }
  }
  if (planData.termsUrl && !/^https:\/\//i.test(planData.termsUrl)) return { error: 'Plan document links must use HTTPS.' }
  if (planData.imageUrl && !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(planData.imageUrl)) return { error: 'Upload a valid JPEG plan image.' }
  return { data: { ...planData, dailyProfitPaise, profitReturnPaise, ...(pricePaise ? { pricePaise } : {}) } }
}

router.get('/overview', asyncRoute(async (_req, res) => {
  const [users, activeUsers, plans, pendingDeposits, pendingWithdrawals, pendingApplications, recentEntries] = await Promise.all([
    User.countDocuments(), User.countDocuments({ status: 'active' }), InvestmentPlan.countDocuments({ isActive: true }),
    Deposit.countDocuments({ status: 'pending' }), Withdrawal.countDocuments({ status: 'pending' }), PlanApplication.countDocuments({ status: 'pending' }),
    LedgerEntry.find().sort({ createdAt: -1 }).limit(8).populate('userId', 'name mobile').lean(),
  ])
  res.json({ overview: { users, activeUsers, plans, pendingDeposits, pendingWithdrawals, pendingApplications, recentEntries } })
}))

router.get('/users', asyncRoute(async (req, res) => {
  const search = String(req.query.search || '').trim().slice(0, 80)
  const page = Math.max(1, Math.min(1000, Number(req.query.page || 1)))
  const filter = search ? { $or: [{ mobile: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } }, { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }] } : {}
  const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean(), User.countDocuments(filter)])
  res.json({ users: users.map(safeUser), total, page })
}))

router.patch('/users/:id', asyncRoute(async (req, res) => {
  const parsed = z.object({ status: z.enum(['active', 'blocked']).optional(), profileStatus: z.enum(['not_started', 'pending', 'verified', 'rejected']).optional(), role: z.enum(['user', 'admin']).optional(), name: z.string().trim().max(100).optional() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found.' })
  if (user._id.equals(req.user._id) && parsed.data.status === 'blocked') return res.status(400).json({ error: 'You cannot block your own administrator account.' })
  if (user._id.equals(req.user._id) && parsed.data.role === 'user') return res.status(400).json({ error: 'You cannot remove your own administrator access here.' })
  if (user.role === 'admin' && parsed.data.role === 'user') {
    const administratorCount = await User.countDocuments({ role: 'admin', status: 'active' })
    if (administratorCount <= 1) return res.status(409).json({ error: 'Keep at least one active administrator.' })
  }
  Object.assign(user, parsed.data)
  await user.save()
  await AuditLog.create({ actorId: req.user._id, action: 'user.updated', targetType: 'user', targetId: user._id, details: parsed.data })
  res.json({ user: safeUser(user) })
}))

router.get('/plans', asyncRoute(async (_req, res) => {
  const plans = await InvestmentPlan.find().sort({ createdAt: -1 }).lean()
  res.json({ plans: plans.map((plan) => ({ ...plan, price: plan.pricePaise ? asRupees(plan.pricePaise) : null, dailyProfit: asRupees(plan.dailyProfitPaise || 0), profitReturn: asRupees(plan.profitReturnPaise || 0) })) })
}))

async function enforcePlanCategoryLimit(category, isActive, excludedId = null) {
  if (!isActive || !['Daily', 'VIP'].includes(category)) return false
  const filter = { category, isActive: true }
  if (excludedId) filter._id = { $ne: excludedId }
  return (await InvestmentPlan.countDocuments(filter)) >= 9
}

router.post('/plans', asyncRoute(async (req, res) => {
  const parsed = parsePlan(req.body, { requirePrice: true })
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  if (await enforcePlanCategoryLimit(parsed.data.category, parsed.data.isActive)) return res.status(409).json({ error: `Arvo allows up to 9 active ${parsed.data.category} plans.` })
  const plan = await InvestmentPlan.create({ ...parsed.data, createdBy: req.user._id })
  await AuditLog.create({ actorId: req.user._id, action: 'plan.created', targetType: 'investmentPlan', targetId: plan._id, details: { slug: plan.slug } })
  res.status(201).json({ plan: { ...plan.toObject(), price: plan.pricePaise ? asRupees(plan.pricePaise) : null, dailyProfit: asRupees(plan.dailyProfitPaise || 0), profitReturn: asRupees(plan.profitReturnPaise || 0) } })
}))

router.patch('/plans/:id', asyncRoute(async (req, res) => {
  const parsed = parsePlan(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const currentPlan = await InvestmentPlan.findById(req.params.id).select('pricePaise')
  if (!currentPlan) return res.status(404).json({ error: 'Plan not found.' })
  const nextPricePaise = parsed.data.pricePaise ?? currentPlan.pricePaise
  if (parsed.data.isActive && !nextPricePaise) return res.status(400).json({ error: 'Set a fixed price before publishing this plan.' })
  if (await enforcePlanCategoryLimit(parsed.data.category, parsed.data.isActive, currentPlan._id)) return res.status(409).json({ error: `Arvo allows up to 9 active ${parsed.data.category} plans.` })
  const plan = await InvestmentPlan.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true })
  await AuditLog.create({ actorId: req.user._id, action: 'plan.updated', targetType: 'investmentPlan', targetId: plan._id, details: { slug: plan.slug } })
  res.json({ plan: { ...plan.toObject(), price: plan.pricePaise ? asRupees(plan.pricePaise) : null, dailyProfit: asRupees(plan.dailyProfitPaise || 0), profitReturn: asRupees(plan.profitReturnPaise || 0) } })
}))

router.get('/deposits', asyncRoute(async (req, res) => {
  const status = ['pending', 'accepted', 'rejected'].includes(req.query.status) ? req.query.status : undefined
  const deposits = await Deposit.find(status ? { status } : {}).populate('userId', 'mobile name').sort({ createdAt: -1 }).limit(100).lean()
  res.json({ deposits })
}))

router.patch('/deposits/:id/review', asyncRoute(async (req, res) => {
  const parsed = z.object({ decision: z.enum(['accept', 'reject']), note: z.string().trim().max(500).default('') }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const deposit = await withTransaction(async (session) => {
    const status = parsed.data.decision === 'accept' ? 'accepted' : 'rejected'
    const record = await Deposit.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { $set: { status, reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: parsed.data.note } }, { new: true, session })
    if (!record) {
      const error = new Error('Deposit is not pending or no longer exists.')
      error.status = 409
      throw error
    }
    if (status === 'accepted') {
      const wallet = await walletFor(record.userId, session)
      wallet.availablePaise += record.amountPaise
      await wallet.save({ session })
      await ledger(session, { userId: record.userId, kind: 'deposit', direction: 'credit', amountPaise: record.amountPaise, referenceType: 'deposit', referenceId: record._id, description: 'Deposit accepted by administrator' })
      await queueWelcomeReward(session, record.userId)
    }
    await audit(session, req.user._id, `deposit.${status}`, 'deposit', record._id, { amountPaise: record.amountPaise })
    return record
  })
  res.json({ deposit })
}))

router.get('/withdrawals', asyncRoute(async (req, res) => {
  const status = ['pending', 'approved', 'paid', 'rejected'].includes(req.query.status) ? req.query.status : undefined
  const withdrawals = await Withdrawal.find(status ? { status } : {}).populate('userId', 'mobile name').sort({ createdAt: -1 }).limit(100).lean()
  res.json({ withdrawals })
}))

router.patch('/withdrawals/:id/review', asyncRoute(async (req, res) => {
  const parsed = z.object({ decision: z.enum(['approve', 'reject', 'paid']), note: z.string().trim().max(500).default('') }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const withdrawal = await withTransaction(async (session) => {
    const current = await Withdrawal.findById(req.params.id).session(session)
    if (!current) {
      const error = new Error('Withdrawal not found.')
      error.status = 404
      throw error
    }
    const decision = parsed.data.decision
    if (decision === 'approve' && current.status !== 'pending') {
      const error = new Error('Only pending withdrawals can be approved.')
      error.status = 409
      throw error
    }
    if (decision === 'paid' && current.status !== 'approved') {
      const error = new Error('Approve the withdrawal before marking it paid.')
      error.status = 409
      throw error
    }
    if (decision === 'reject' && !['pending', 'approved'].includes(current.status)) {
      const error = new Error('Only pending or approved withdrawals can be rejected.')
      error.status = 409
      throw error
    }
    const status = decision === 'approve' ? 'approved' : decision === 'paid' ? 'paid' : 'rejected'
    current.status = status
    current.reviewedBy = req.user._id
    current.reviewedAt = new Date()
    current.reviewNote = parsed.data.note
    await current.save({ session })
    const wallet = await walletFor(current.userId, session)
    if (decision === 'paid') {
      wallet.reservedPaise = Math.max(0, wallet.reservedPaise - current.amountPaise)
      await LedgerEntry.updateOne({ referenceType: 'withdrawal', referenceId: current._id, kind: 'withdrawal_hold' }, { $set: { status: 'posted' } }, { session })
    } else if (decision === 'reject') {
      wallet.reservedPaise = Math.max(0, wallet.reservedPaise - current.amountPaise)
      wallet.availablePaise += current.amountPaise
      await ledger(session, { userId: current.userId, kind: 'withdrawal_refund', direction: 'credit', amountPaise: current.amountPaise, referenceType: 'withdrawal', referenceId: current._id, description: 'Rejected withdrawal returned to wallet' })
    }
    await wallet.save({ session })
    await audit(session, req.user._id, `withdrawal.${status}`, 'withdrawal', current._id, { amountPaise: current.amountPaise })
    return current
  })
  res.json({ withdrawal })
}))

router.get('/applications', asyncRoute(async (req, res) => {
  const status = ['pending', 'accepted', 'rejected'].includes(req.query.status) ? req.query.status : undefined
  const applications = await PlanApplication.find(status ? { status } : {}).populate('userId', 'mobile name').populate('planId', 'name slug').sort({ createdAt: -1 }).limit(100).lean()
  res.json({ applications })
}))

router.patch('/applications/:id/review', asyncRoute(async (req, res) => {
  const parsed = z.object({ decision: z.enum(['accept', 'reject']), note: z.string().trim().max(500).default('') }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const application = await withTransaction(async (session) => {
    const current = await PlanApplication.findOne({ _id: req.params.id, status: 'pending' }).session(session)
    if (!current) {
      const error = new Error('Application is not pending or no longer exists.')
      error.status = 409
      throw error
    }
    const status = parsed.data.decision === 'accept' ? 'accepted' : 'rejected'
    current.status = status
    current.reviewedBy = req.user._id
    current.reviewedAt = new Date()
    current.reviewNote = parsed.data.note
    await current.save({ session })
    if (status === 'accepted') {
      const wallet = await walletFor(current.userId, session)
      if (wallet.availablePaise < current.amountPaise) {
        const error = new Error('User wallet balance is too low to accept this application.')
        error.status = 409
        throw error
      }
      wallet.availablePaise -= current.amountPaise
      wallet.investedPaise += current.amountPaise
      await wallet.save({ session })
      const plan = await InvestmentPlan.findById(current.planId).session(session)
      if (!plan || plan.comingSoon) {
        const error = new Error('This plan is not available for investment.')
        error.status = 409
        throw error
      }
      if (!plan.pricePaise || !plan.cycle || !plan.durationDays || !plan.profitReturnPaise) {
        const error = new Error('Set complete cycle, duration and profit terms before approving this application.')
        error.status = 409
        throw error
      }
      await PlanPosition.create([{ userId: current.userId, planId: current.planId, applicationId: current._id, amountPaise: current.amountPaise, cycle: plan.cycle, durationDays: plan.durationDays, profitReturnPaise: plan.profitReturnPaise, investmentRoiPct: plan.investmentRoiPct }], { session })
      await ledger(session, { userId: current.userId, kind: 'investment', direction: 'debit', amountPaise: current.amountPaise, referenceType: 'planApplication', referenceId: current._id, description: 'Investment application accepted' })
      await queueReferralRewards(session, current)
      await queueWelcomeReward(session, current.userId)
    }
    await audit(session, req.user._id, `application.${status}`, 'planApplication', current._id, { amountPaise: current.amountPaise })
    return current
  })
  res.json({ application })
}))

router.get('/positions', asyncRoute(async (_req, res) => {
  const positions = await PlanPosition.find({ status: 'active' }).populate('userId', 'name mobile').populate('planId', 'name cycle durationDays profitReturnPaise investmentRoiPct').sort({ startedAt: -1 }).limit(200).lean()
  res.json({ positions })
}))

function releaseCycleDays(cycle) {
  return ({ daily: 1, weekly: 7, monthly: 30, quarterly: 90, yearly: 365, one_time: 36500 })[cycle] || 30
}

router.post('/positions/:id/release-due', asyncRoute(async (req, res) => {
  const released = await withTransaction(async (session) => {
    const position = await PlanPosition.findById(req.params.id).populate('planId', 'cycle durationDays profitReturnPaise investmentRoiPct').session(session)
    if (!position || position.status !== 'active') {
      const error = new Error('Active plan position not found.')
      error.status = 404
      throw error
    }
    const cycle = position.cycle || position.planId?.cycle || 'monthly'
    const durationDays = Number(position.durationDays || position.planId?.durationDays || 30)
    const profitReturnPaise = Number(position.profitReturnPaise ?? position.planId?.profitReturnPaise ?? 0)
    const cycleDays = releaseCycleDays(cycle)
    const installmentCount = cycle === 'one_time' ? 1 : Math.max(1, Math.ceil(durationDays / cycleDays))
    const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(position.startedAt).getTime()) / 86400000))
    const dueCycles = cycle === 'one_time'
      ? (elapsedDays >= durationDays ? 1 : 0)
      : Math.min(installmentCount, Math.floor(elapsedDays / cycleDays))
    const firstSequence = Number(position.releasedCycles || 0) + 1
    if (dueCycles < firstSequence) {
      const error = new Error('No scheduled return is due for release yet.')
      error.status = 409
      throw error
    }
    const wallet = await walletFor(position.userId, session)
    let releasedTotal = 0
    const entries = []
    for (let sequence = firstSequence; sequence <= dueCycles; sequence += 1) {
      const amountPaise = sequence === installmentCount
        ? profitReturnPaise - Math.floor(profitReturnPaise / installmentCount) * (installmentCount - 1)
        : Math.floor(profitReturnPaise / installmentCount)
      if (amountPaise <= 0) continue
      const [release] = await PlanRelease.create([{ positionId: position._id, sequence, amountPaise, releasedBy: req.user._id }], { session })
      wallet.availablePaise += amountPaise
      releasedTotal += amountPaise
      entries.push({ amountPaise, releaseId: release._id, sequence })
      await ledger(session, { userId: position.userId, kind: 'plan_return', direction: 'credit', amountPaise, referenceType: 'planRelease', referenceId: release._id, description: `Scheduled plan return · release ${sequence}/${installmentCount}` })
    }
    const wasMatured = dueCycles >= installmentCount
    if (!releasedTotal && !wasMatured) {
      const error = new Error('No scheduled return is due for release yet.')
      error.status = 409
      throw error
    }
    position.releasedCycles = dueCycles
    position.releasedPaise = Number(position.releasedPaise || 0) + releasedTotal
    let principalReturnedPaise = 0
    if (wasMatured && position.releasedPaise >= profitReturnPaise) {
      principalReturnedPaise = position.amountPaise
      wallet.investedPaise = Math.max(0, wallet.investedPaise - position.amountPaise)
      wallet.availablePaise += position.amountPaise
      position.status = 'closed'
      await ledger(session, { userId: position.userId, kind: 'investment_return', direction: 'credit', amountPaise: position.amountPaise, referenceType: 'planPosition', referenceId: position._id, description: 'Investment principal returned at cycle completion' })
    }
    await position.save({ session })
    await wallet.save({ session })
    await audit(session, req.user._id, 'planReturn.released', 'planPosition', position._id, { cycles: entries.map((entry) => entry.sequence), profitPaise: releasedTotal, principalPaise: principalReturnedPaise })
    return { position, releasedTotal, principalReturnedPaise, entries }
  })
  res.json({ release: released })
}))

router.get('/rewards', asyncRoute(async (_req, res) => {
  const claims = await RewardClaim.find().populate('userId', 'name mobile').populate('sourceUserId', 'name mobile').populate('sourceApplicationId', 'amountPaise').sort({ createdAt: -1 }).limit(200).lean()
  res.json({ claims })
}))

router.patch('/rewards/:id/review', asyncRoute(async (req, res) => {
  const parsed = z.object({ decision: z.enum(['approve', 'reject']), note: z.string().trim().max(500).default('') }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const claim = await withTransaction(async (session) => {
    const current = await RewardClaim.findOne({ _id: req.params.id, status: 'pending' }).session(session)
    if (!current) {
      const error = new Error('Reward claim is not pending or no longer exists.')
      error.status = 409
      throw error
    }
    current.status = parsed.data.decision === 'approve' ? 'approved' : 'rejected'
    current.reviewedBy = req.user._id
    current.reviewedAt = new Date()
    current.reviewNote = parsed.data.note
    await current.save({ session })
    if (current.status === 'approved') {
      const wallet = await walletFor(current.userId, session)
      wallet.availablePaise += current.amountPaise
      await wallet.save({ session })
      const kind = current.kind === 'referral_purchase' ? 'referral_reward' : current.kind === 'team_milestone' ? 'team_bonus' : current.kind === 'daily_invite' ? 'daily_bonus' : 'welcome_bonus'
      await ledger(session, { userId: current.userId, kind, direction: 'credit', amountPaise: current.amountPaise, referenceType: 'rewardClaim', referenceId: current._id, description: 'Reward approved by administrator' })
    }
    await audit(session, req.user._id, `reward.${current.status}`, 'rewardClaim', current._id, { amountPaise: current.amountPaise, kind: current.kind })
    return current
  })
  res.json({ claim })
}))

router.get('/settings', asyncRoute(async (_req, res) => {
  let settings = await PlatformSettings.findOne({ key: 'main' })
  if (!settings) settings = await PlatformSettings.create({ key: 'main', languages: ['en'], themeIds: ['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy'], activeTheme: 'emerald', paymentMethods: [] })
  const emailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  res.json({ settings, integrations: { emailConfigured } })
}))

router.put('/settings', asyncRoute(async (req, res) => {
  const parsed = z.object({
    paymentMethods: z.array(z.object({ key: z.string().trim().min(2).max(60), label: z.string().trim().min(2).max(80), instructions: z.string().trim().max(2000), active: z.boolean() })).max(10),
    languages: z.array(z.string().trim().min(2).max(12)).min(1).max(10),
    themeIds: z.array(z.enum(['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy'])).min(1).max(5),
    rewards: z.object({
      enabled: z.boolean().default(false),
      welcomeBonus: z.coerce.number().min(0).max(1000000).default(0),
      level1Pct: z.coerce.number().min(0).max(100).default(0),
      level2Pct: z.coerce.number().min(0).max(100).default(0),
      level3Pct: z.coerce.number().min(0).max(100).default(0),
      teamMilestone: z.coerce.number().min(0).max(100000000).default(0),
      teamMilestoneReward: z.coerce.number().min(0).max(1000000).default(0),
      dailyInviteReward: z.coerce.number().min(0).max(1000000).default(0),
    }).default({}),
  }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const keys = parsed.data.paymentMethods.map((method) => method.key)
  if (new Set(keys).size !== keys.length) return res.status(400).json({ error: 'Payment method keys must be unique.' })
  const { rewards, ...settingsFields } = parsed.data
  const settings = await PlatformSettings.findOneAndUpdate({ key: 'main' }, { $set: { ...settingsFields, rewards: { enabled: rewards.enabled, welcomeBonusPaise: Math.round(rewards.welcomeBonus * 100), referralLevel1Pct: rewards.level1Pct, referralLevel2Pct: rewards.level2Pct, referralLevel3Pct: rewards.level3Pct, teamMilestonePaise: Math.round(rewards.teamMilestone * 100), teamMilestoneRewardPaise: Math.round(rewards.teamMilestoneReward * 100), dailyInvitePaise: Math.round(rewards.dailyInviteReward * 100) }, updatedBy: req.user._id } }, { new: true, upsert: true, runValidators: true })
  await AuditLog.create({ actorId: req.user._id, action: 'settings.updated', targetType: 'platformSettings', targetId: settings._id, details: { paymentMethods: settings.paymentMethods.length } })
  res.json({ settings })
}))

// Only authenticated administrators may publish a platform-wide visual theme.
router.patch('/theme', asyncRoute(async (req, res) => {
  const parsed = z.object({
    activeTheme: z.enum(['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy']),
  }).strict().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Select a valid Arvo theme.' })

  const previous = await PlatformSettings.findOne({ key: 'main' }).lean()
  const settings = await PlatformSettings.findOneAndUpdate(
    { key: 'main' },
    { $set: { activeTheme: parsed.data.activeTheme, updatedBy: req.user._id },
      $setOnInsert: { languages: ['en'], themeIds: ['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy'], paymentMethods: [] } },
    { new: true, upsert: true, runValidators: true },
  )
  await AuditLog.create({
    actorId: req.user._id,
    action: 'theme.published',
    targetType: 'platformSettings',
    targetId: settings._id,
    details: { from: previous?.activeTheme || 'emerald', to: settings.activeTheme },
  })
  res.json({ activeTheme: settings.activeTheme, settings })
}))

router.get('/ledger', asyncRoute(async (req, res) => {
  const entries = await LedgerEntry.find().populate('userId', 'name mobile').sort({ createdAt: -1 }).limit(200).lean()
  res.json({ entries })
}))

router.get('/audit', asyncRoute(async (_req, res) => {
  const entries = await AuditLog.find().populate('actorId', 'name mobile').sort({ createdAt: -1 }).limit(200).lean()
  res.json({ entries })
}))

const contentTypes = ['news', 'banner', 'work_area', 'about', 'service', 'investor', 'partner', 'social', 'menu', 'logo', 'icon']
const contentInput = z.object({
  type: z.enum(contentTypes),
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  body: z.string().trim().max(12000).default(''),
  imageUrl: z.string().trim().max(600000).default(''),
  language: z.string().trim().toLowerCase().min(2).max(12).default('en'),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isPublished: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
})

function parseContent(input) {
  const parsed = contentInput.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const embeddedImage = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(parsed.data.imageUrl)
  if (parsed.data.imageUrl && !/^https:\/\//i.test(parsed.data.imageUrl) && !embeddedImage) return { error: 'Content image links must use HTTPS or be uploaded as an image.' }
  if (parsed.data.type === 'banner' && parsed.data.isPublished && !parsed.data.imageUrl) return { error: 'Add an image before publishing a carousel slide.' }
  const targetUrl = typeof parsed.data.metadata?.url === 'string' ? parsed.data.metadata.url.trim() : ''
  if (targetUrl && !/^(https:\/\/|mailto:|tel:)/i.test(targetUrl)) return { error: 'Content links must use HTTPS, email or telephone format.' }
  return { data: parsed.data }
}

async function bannerLimitReached(data, excludeId) {
  if (data.type !== 'banner') return false
  const filter = { type: 'banner' }
  if (excludeId) filter._id = { $ne: excludeId }
  return (await ContentItem.countDocuments(filter)) >= 10
}

router.get('/content', asyncRoute(async (req, res) => {
  const type = contentTypes.includes(req.query.type) ? req.query.type : undefined
  const filter = type ? { type } : {}
  const items = await ContentItem.find(filter).sort({ type: 1, sortOrder: 1, createdAt: -1 }).limit(500).lean()
  res.json({ items })
}))

router.post('/content', asyncRoute(async (req, res) => {
  const parsed = parseContent(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  if (await bannerLimitReached(parsed.data)) return res.status(409).json({ error: 'A maximum of 10 carousel images is allowed. Delete an image before adding another.' })
  const item = await ContentItem.create({ ...parsed.data, createdBy: req.user._id })
  await AuditLog.create({ actorId: req.user._id, action: 'content.created', targetType: parsed.data.type, targetId: item._id, details: { slug: item.slug } })
  res.status(201).json({ item })
}))

router.patch('/content/:id', asyncRoute(async (req, res) => {
  const parsed = parseContent(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const existing = await ContentItem.findById(req.params.id).select('_id')
  if (!existing) return res.status(404).json({ error: 'Content item not found.' })
  if (await bannerLimitReached(parsed.data, existing._id)) return res.status(409).json({ error: 'A maximum of 10 carousel images is allowed. Delete an image before adding another.' })
  const item = await ContentItem.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true })
  if (!item) return res.status(404).json({ error: 'Content item not found.' })
  await AuditLog.create({ actorId: req.user._id, action: 'content.updated', targetType: item.type, targetId: item._id, details: { slug: item.slug } })
  res.json({ item })
}))

router.delete('/content/:id', asyncRoute(async (req, res) => {
  const item = await ContentItem.findByIdAndDelete(req.params.id)
  if (!item) return res.status(404).json({ error: 'Content item not found.' })
  await AuditLog.create({ actorId: req.user._id, action: 'content.deleted', targetType: item.type, targetId: item._id, details: { slug: item.slug } })
  res.json({ ok: true })
}))

router.get('/support/conversations', asyncRoute(async (_req, res) => {
  const messages = await SupportMessage.find().sort({ createdAt: -1 }).limit(1000).lean()
  const conversations = new Map()
  for (const message of messages) {
    const key = message.userId.toString()
    if (!conversations.has(key)) conversations.set(key, { userId: key, latest: message, unread: 0 })
    if (message.senderRole === 'user' && !message.readAt) conversations.get(key).unread += 1
  }
  const ids = [...conversations.keys()]
  const users = await User.find({ _id: { $in: ids } }).select('name mobile status').lean()
  const byId = new Map(users.map((user) => [user._id.toString(), user]))
  res.json({ conversations: [...conversations.values()].map((item) => ({ ...item, user: byId.get(item.userId) || null })) })
}))

router.get('/support/:userId/messages', asyncRoute(async (req, res) => {
  const user = await User.findById(req.params.userId).select('_id')
  if (!user) return res.status(404).json({ error: 'User not found.' })
  const messages = await SupportMessage.find({ userId: user._id }).sort({ createdAt: 1 }).limit(200).lean()
  await SupportMessage.updateMany({ userId: user._id, senderRole: 'user', readAt: null }, { $set: { readAt: new Date() } })
  res.json({ messages })
}))

router.post('/support/:userId/messages', asyncRoute(async (req, res) => {
  const parsed = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const user = await User.findById(req.params.userId).select('_id')
  if (!user) return res.status(404).json({ error: 'User not found.' })
  const message = await SupportMessage.create({ userId: user._id, senderRole: 'admin', body: parsed.data.body })
  res.status(201).json({ message })
}))

export default router
