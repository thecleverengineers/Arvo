import crypto from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { CaptchaChallenge, EmailVerification, OtpChallenge, User, Wallet } from '../models.js'
import { asyncRoute, cookieOptions, requireAuth } from '../middleware.js'
import { isDemoAuth, sendOtp, verifyOtp } from '../fast2sms.js'
import { hashPassword, hashToken, makeReferralCode, safeUser, signSession, verifyPassword } from '../security.js'

const router = Router()
const phoneSchema = z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit Indian mobile number.')
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } })
const captchaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many CAPTCHA requests. Try again later.' } })
const sendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many verification code requests. Try again later.' } })

function cleanMobile(value) { return String(value || '').replace(/\D/g, '') }
function configuredAdminMobile() { return cleanMobile(process.env.ADMIN_MOBILE).slice(-10) }

function captchaAnswerHash(challengeId, answer) {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'local-development-only-do-not-use-in-production-arvo-secret'
  return crypto.createHmac('sha256', secret).update(challengeId + ':' + answer).digest('hex')
}

function hashMatches(expectedHex, actualHex) {
  if (!/^[a-f0-9]{64}$/i.test(expectedHex || '') || !/^[a-f0-9]{64}$/i.test(actualHex || '')) return false
  return crypto.timingSafeEqual(Buffer.from(expectedHex, 'hex'), Buffer.from(actualHex, 'hex'))
}

async function consumeCaptcha(challengeId, answer) {
  if (!/^[a-f0-9]{40,80}$/i.test(challengeId || '') || !/^\d{6}$/.test(answer || '')) return false
  const now = new Date()
  const tokenHash = hashToken(challengeId)
  const challenge = await CaptchaChallenge.findOne({ tokenHash, expiresAt: { $gt: now }, consumedAt: null, attempts: { $lt: 5 } })
  if (!challenge) return false

  const matches = hashMatches(challenge.answerHash, captchaAnswerHash(challengeId, answer))
  if (!matches) {
    await CaptchaChallenge.updateOne({ _id: challenge._id, consumedAt: null, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } })
    return false
  }

  const claimed = await CaptchaChallenge.findOneAndUpdate(
    { _id: challenge._id, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: 5 } },
    { $set: { consumedAt: now }, $inc: { attempts: 1 } },
    { new: true },
  )
  return Boolean(claimed)
}

async function requireCaptcha(req, res) {
  const challengeId = String(req.body?.captchaChallengeId || '')
  const answer = String(req.body?.captchaAnswer || '').trim()
  if (!await consumeCaptcha(challengeId, answer)) {
    res.status(400).json({ error: 'The numeric CAPTCHA is incorrect or expired. Refresh it and try again.' })
    return false
  }
  return true
}

function captchaSvg(code) {
  const digits = [...code].map((digit, index) => {
    const x = 20 + index * 31
    const y = 41 + crypto.randomInt(-5, 6)
    const rotate = crypto.randomInt(-13, 14)
    return '<text x="' + x + '" y="' + y + '" transform="rotate(' + rotate + ' ' + x + ' ' + y + ')">' + digit + '</text>'
  }).join('')
  const noise = Array.from({ length: 7 }, () => {
    const x1 = crypto.randomInt(2, 190), y1 = crypto.randomInt(5, 53)
    const x2 = crypto.randomInt(2, 190), y2 = crypto.randomInt(5, 53)
    return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '"/>'
  }).join('')
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="58" viewBox="0 0 200 58"><rect width="200" height="58" rx="12" fill="#f1f5f2"/><g fill="none" stroke="#b5c4bd" stroke-width="1" opacity=".72">' + noise + '</g><g fill="#123c31" font-family="Arial,sans-serif" font-size="31" font-weight="700">' + digits + '</g></svg>'
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
}

router.get('/captcha', captchaLimiter, asyncRoute(async (_req, res) => {
  const challengeId = crypto.randomBytes(24).toString('hex')
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  await CaptchaChallenge.create({
    tokenHash: hashToken(challengeId),
    answerHash: captchaAnswerHash(challengeId, code),
    expiresAt: new Date(Date.now() + 5 * 60_000),
  })
  res.set('Cache-Control', 'no-store')
  res.json({ challengeId, image: captchaSvg(code), expiresInSeconds: 300 })
}))

router.post('/register', authLimiter, asyncRoute(async (req, res) => {
  const mobile = cleanMobile(req.body?.mobile)
  const parsed = z.object({
    password: z.string().min(8, 'Use a password with at least 8 characters.').max(128),
    confirmPassword: z.string().min(8).max(128),
    referralCode: z.string().trim().max(20).optional().default(''),
  }).safeParse(req.body)
  if (!phoneSchema.safeParse(mobile).success) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' })
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Check the registration details and try again.' })
  if (parsed.data.password !== parsed.data.confirmPassword) return res.status(400).json({ error: 'Your passwords do not match.' })
  if (!await requireCaptcha(req, res)) return

  const referralCode = parsed.data.referralCode.trim().toUpperCase()
  let referrer = null
  if (referralCode) {
    referrer = await User.findOne({ referralCode, status: 'active' })
    if (!referrer) return res.status(400).json({ error: 'That referral code could not be found.' })
    if (referrer.mobile === mobile) return res.status(400).json({ error: 'You cannot use your own referral code.' })
  }

  const existing = await User.findOne({ mobile })
  if (existing) return res.status(409).json({ error: 'This mobile already has an Arvo account. Sign in instead.' })
  const adminMobile = configuredAdminMobile()
  try {
    const user = await User.create({
      mobile,
      passwordHash: await hashPassword(parsed.data.password),
      role: adminMobile && adminMobile === mobile ? 'admin' : 'user',
      referralCode: makeReferralCode(),
      referredBy: referrer?.referralCode || '',
    })
    await Wallet.create({ userId: user._id, currency: 'USDT' })
    res.cookie('arvo_session', signSession(user), cookieOptions())
    res.status(201).json({ ok: true, user: safeUser(user, { includeAvatar: true }) })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account was just created for this mobile. Sign in instead.' })
    throw error
  }
}))

router.post('/login', authLimiter, asyncRoute(async (req, res) => {
  const mobile = cleanMobile(req.body?.mobile)
  const parsed = z.object({ password: z.string().min(1).max(128) }).safeParse(req.body)
  if (!phoneSchema.safeParse(mobile).success) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' })
  if (!parsed.success) return res.status(400).json({ error: 'Enter your password.' })
  if (!await requireCaptcha(req, res)) return

  const user = await User.findOne({ mobile }).select('+passwordHash')
  if (!user || !user.passwordHash || !await verifyPassword(user.passwordHash, parsed.data.password)) {
    return res.status(401).json({ error: 'Mobile number or password is incorrect. Use “Forgot or set password” if this is an older account.' })
  }
  if (user.status !== 'active') return res.status(403).json({ error: 'This account has been suspended.' })
  const adminMobile = configuredAdminMobile()
  if (adminMobile && adminMobile === mobile && user.role !== 'admin') {
    user.role = 'admin'
    await user.save()
  }
  res.cookie('arvo_session', signSession(user), cookieOptions())
  res.json({ ok: true, user: safeUser(user, { includeAvatar: true }) })
}))

router.post('/password/reset/send', sendLimiter, asyncRoute(async (req, res) => {
  const mobile = cleanMobile(req.body?.mobile)
  if (!phoneSchema.safeParse(mobile).success) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' })
  if (!await requireCaptcha(req, res)) return

  const user = await User.findOne({ mobile })
  const genericMessage = 'If an account exists for this number, a verification code has been sent.'
  if (!user || user.status !== 'active') return res.json({ ok: true, message: genericMessage })

  const now = new Date()
  const lastMinute = new Date(now.getTime() - 60_000)
  const hourAgo = new Date(now.getTime() - 60 * 60_000)
  const latest = await OtpChallenge.findOne({ mobile, intent: 'password_reset', createdAt: { $gte: hourAgo } }).sort({ createdAt: -1 })
  if (latest?.createdAt > lastMinute) return res.status(429).json({ error: 'Wait a minute before requesting another code.' })
  const recentCount = await OtpChallenge.countDocuments({ mobile, intent: 'password_reset', createdAt: { $gte: hourAgo } })
  if (recentCount >= 5) return res.status(429).json({ error: 'Code request limit reached for this number. Try again later.' })

  const mode = isDemoAuth() ? 'demo' : 'fast2sms'
  await sendOtp(mobile)
  const expiresAt = new Date(now.getTime() + Number(process.env.FAST2SMS_OTP_EXPIRY_MINUTES || 10) * 60_000)
  await OtpChallenge.updateMany({ mobile, intent: 'password_reset', status: 'pending' }, { $set: { status: 'expired' } })
  await OtpChallenge.create({ mobile, intent: 'password_reset', mode, sentAt: now, expiresAt })
  res.json({
    ok: true,
    message: genericMessage,
    expiresInSeconds: Number(process.env.FAST2SMS_OTP_EXPIRY_MINUTES || 10) * 60,
    demoOtp: mode === 'demo' ? (process.env.DEMO_OTP || '246810') : undefined,
  })
}))

router.post('/password/reset', sendLimiter, asyncRoute(async (req, res) => {
  const mobile = cleanMobile(req.body?.mobile)
  const parsed = z.object({ otp: z.string().trim().regex(/^\d{4,10}$/), password: z.string().min(8).max(128) }).safeParse(req.body)
  if (!phoneSchema.safeParse(mobile).success) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' })
  if (!parsed.success) return res.status(400).json({ error: 'Enter the verification code and a password with at least 8 characters.' })
  const challenge = await OtpChallenge.findOne({ mobile, intent: 'password_reset', status: 'pending' }).sort({ createdAt: -1 })
  if (!challenge || challenge.expiresAt < new Date()) return res.status(400).json({ error: 'This code has expired. Request a new one.' })
  if (challenge.attempts >= 5) return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' })

  challenge.attempts += 1
  await challenge.save()
  let verified = false
  try { verified = await verifyOtp(mobile, parsed.data.otp) }
  catch (error) { return res.status(error.status || 502).json({ error: error.message || 'Code verification failed.' }) }
  if (!verified) return res.status(400).json({ error: 'The code is incorrect or expired.' })
  const claimed = await OtpChallenge.findOneAndUpdate({ _id: challenge._id, status: 'pending' }, { $set: { status: 'verified' } }, { new: true })
  if (!claimed) return res.status(409).json({ error: 'This code was already used. Request a new one.' })

  const user = await User.findOne({ mobile })
  if (!user || user.status !== 'active') return res.status(400).json({ error: 'The account could not be verified. Sign up to continue.' })
  user.passwordHash = await hashPassword(parsed.data.password)
  const adminMobile = configuredAdminMobile()
  if (adminMobile && adminMobile === mobile) user.role = 'admin'
  await user.save()
  res.cookie('arvo_session', signSession(user), cookieOptions())
  res.json({ ok: true, user: safeUser(user, { includeAvatar: true }) })
}))

router.post('/logout', (_req, res) => { res.clearCookie('arvo_session', cookieOptions()); res.json({ ok: true }) })
router.get('/me', requireAuth, asyncRoute(async (req, res) => res.json({ user: safeUser(req.user, { includeAvatar: true }) })))

router.post('/email/send-verification', requireAuth, asyncRoute(async (req, res) => {
  const email = z.string().trim().email().max(254).safeParse(req.body?.email || req.user.email)
  if (!email.success) return res.status(400).json({ error: 'Enter a valid email address.' })
  const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
  if (!smtpConfigured) return res.status(503).json({ error: 'Email verification is not configured yet. Ask the administrator to configure SMTP.' })
  await EmailVerification.deleteMany({ userId: req.user._id })
  req.user.email = email.data
  req.user.emailVerifiedAt = null
  await req.user.save()
  const token = crypto.randomBytes(32).toString('hex')
  await EmailVerification.create({ userId: req.user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) })
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE) === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } })
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  const link = `${origin}/?verifyEmail=${encodeURIComponent(token)}`
  await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: email.data, subject: 'Verify your Arvo email', text: `Confirm your email address using this link: ${link}\nThis link expires in 30 minutes.` })
  res.json({ ok: true, message: 'Verification link sent.' })
}))

router.post('/email/verify', asyncRoute(async (req, res) => {
  const token = String(req.body?.token || '')
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ error: 'Invalid verification link.' })
  const record = await EmailVerification.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } })
  if (!record) return res.status(400).json({ error: 'This verification link has expired or was already used.' })
  const user = await User.findById(record.userId)
  if (!user) return res.status(400).json({ error: 'The account for this verification link no longer exists.' })
  user.emailVerifiedAt = new Date()
  await user.save()
  await record.deleteOne()
  res.json({ ok: true, user: safeUser(user, { includeAvatar: true }) })
}))

export default router
