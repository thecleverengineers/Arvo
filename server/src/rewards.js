import { Deposit, PlanApplication, PlatformSettings, RewardClaim, User } from './models.js'

export async function queueWelcomeReward(session, userId) {
  const settings = await PlatformSettings.findOne({ key: 'main' }).session(session).lean()
  const amountPaise = Number(settings?.rewards?.welcomeBonusPaise || 0)
  if (!settings?.rewards?.enabled || amountPaise <= 0) return
  const [hasAcceptedDeposit, hasAcceptedApplication] = await Promise.all([
    Deposit.exists({ userId, status: 'accepted' }).session(session),
    PlanApplication.exists({ userId, status: 'accepted' }).session(session),
  ])
  if (!hasAcceptedDeposit || !hasAcceptedApplication) return
  const claimKey = `welcome:${userId}`
  if (await RewardClaim.exists({ claimKey }).session(session)) return
  await RewardClaim.create([{ claimKey, userId, amountPaise, kind: 'welcome_bonus' }], { session })
}

export async function queueReferralRewards(session, application) {
  const settings = await PlatformSettings.findOne({ key: 'main' }).session(session).lean()
  const policy = settings?.rewards
  if (!policy?.enabled) return
  const member = await User.findById(application.userId).select('referredBy').session(session).lean()
  let referralCode = member?.referredBy || ''
  const rates = [policy.referralLevel1Pct, policy.referralLevel2Pct, policy.referralLevel3Pct]
  for (let level = 1; level <= 3 && referralCode; level += 1) {
    const sponsor = await User.findOne({ referralCode }).select('_id referredBy').session(session).lean()
    if (!sponsor || sponsor._id.equals(application.userId)) break
    const amountPaise = Math.floor(application.amountPaise * Number(rates[level - 1] || 0) / 100)
    const claimKey = `purchase:${application._id}:${level}`
    if (amountPaise > 0 && !await RewardClaim.exists({ claimKey }).session(session)) {
      await RewardClaim.create([{ claimKey, userId: sponsor._id, sourceUserId: application.userId, sourceApplicationId: application._id, kind: 'referral_purchase', level, amountPaise }], { session })
    }
    referralCode = sponsor.referredBy || ''
  }
}
