import crypto from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { EmailVerification, OtpChallenge, User, Wallet } from '../models.js'
import { asyncRoute, cookieOptions, requireAuth } from '../middleware.js'
import { isDemoAuth, sendOtp, verifyOtp } from '../fast2sms.js'
import { hashToken, makeReferralCode, safeUser, signSession } from '../security.js'

const router = Router()
const phoneSchema = z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit Indian mobile number.')
const sendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many OTP requests. Try again later.' } })

function cleanMobile(value) { return String(value || '').replace(/\D/g, '') }
function configuredAdminMobile() { return cleanMobile(process.env.ADMIN_MOBILE).slice(-10) }

router.post('/otp/send', sendLimiter, asyncRoute(async (req, res) => {
  const mobile = cleanMobile(req.body?.mobile)
  const parsed = phoneSchema.safeParse(mobile)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  const intentResult = z.enum(['signup', 'login']).safeParse(req.body?.intent)
  if (!intentResult.success) return res.status(400).json({ error: 'Choose sign up or log in to continue.' })
  const intent = intentResult.data
  const existingUser = await User.findOne({ mobile })
  if (intent === 'signup' && existingUser) return res.status(409).json({ error: 'This mobile already has an Arvo account. Sign in instead.' })
  if (intent === 'login' && !existingUser) return res.status(404).json({ error: 'No Arvo account was found for this mobile. Create an account first.' })
  if (existingUser && existingUser.status !== 'active') return res.status(403).json({ error: 'This account has been suspended.' })

  const now = new Date()
  const lastMinute = new Date(now.getTime() - 60_000)
  const hourAgo = new Date(now.getTime() - 60 * 60_000)
  const latest = await OtpChallenge.findOne({ mobile, createdAt: { $gte: hourAgo } }).sort({ createdAt: -1 })
  if (latest?.createdAt > lastMinute) return res.status(429).json({ error: 'Wait a minute before requesting another code.' })
  const recentCount = await OtpChallenge.countDocuments({ mobile, createdAt: { $gte: hourAgo } })
  if (recentCount >= 5) return res.status(429).json({ error: 'OTP request limit reached for this number. Try again later.' })

  const mode = isDemoAuth() ? 'demo' : 'fast2sms'
  await sendOtp(mobile)
  const expiresAt = new Date(now.getTime() + Number(process.env.FAST2SMS_OTP_EXPIRY_MINUTES || 10) * 60_000)
  await OtpChallenge.create({ mobile, intent, mode, sentAt: now, expiresAt })
  res.json({ ok: true, expiresInSeconds: Number(process.env.FAST2SMS_OTP_EXPIRY_MINUTES || 10) * 60, demoOtp: mode === 'demo' ? (process.env.DEMO_OTP || '246810') : undefined })
}))

router.post('/otp/verify', sendLimiter, asyncRoute(async (req, res) => {
  const mobile = cleanMobile(req.body?.mobile)
  const otp = String(req.body?.otp || '').trim()
  const parsed = phoneSchema.safeParse(mobile)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message })
  if (!/^\d{4,10}$/.test(otp)) return res.status(400).json({ error: 'Enter the verification code.' })
  const intentResult = z.enum(['signup', 'login']).safeParse(req.body?.intent)
  if (!intentResult.success) return res.status(400).json({ error: 'Choose sign up or log in to continue.' })
  const intent = intentResult.data

  const challenge = await OtpChallenge.findOne({ mobile, intent, status: 'pending' }).sort({ createdAt: -1 })
  if (!challenge || challenge.expiresAt < new Date()) return res.status(400).json({ error: 'This code has expired or does not match this sign-in flow. Request a new one.' })
  if (challenge.attempts >= 5) return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' })
  let user = await User.findOne({ mobile })
  if (intent === 'login' && !user) return res.status(404).json({ error: 'No Arvo account was found for this mobile. Create an account first.' })
  if (intent === 'signup' && user) return res.status(409).json({ error: 'This mobile already has an Arvo account. Sign in instead.' })
  if (user && user.status !== 'active') return res.status(403).json({ error: 'This account has been suspended.' })

  const name = z.string().trim().min(2).max(100).safeParse(req.body?.name || '')
  const email = z.string().trim().email().max(254).safeParse(req.body?.email || '')
  const referralCode = String(req.body?.referralCode || '').trim().toUpperCase().slice(0, 20)
  let referrer = null
  if (intent === 'signup') {
    if (!name.success) return res.status(400).json({ error: 'Enter your name to finish creating your account.' })
    if (req.body?.email && !email.success) return res.status(400).json({ error: 'Enter a valid email address.' })
    if (referralCode) {
      referrer = await User.findOne({ referralCode, status: 'active' })
      if (!referrer) return res.status(400).json({ error: 'That referral code could not be found.' })
      if (referrer.mobile === mobile) return res.status(400).json({ error: 'You cannot use your own referral code.' })
    }
  }

  challenge.attempts += 1
  await challenge.save()

  let verified = false
  try { verified = await verifyOtp(mobile, otp) }
  catch (error) { return res.status(error.status || 502).json({ error: error.message || 'OTP verification failed.' }) }
  if (!verified) return res.status(400).json({ error: 'The code is incorrect or expired.' })

  challenge.status = 'verified'
  await challenge.save()
  if (intent === 'signup') {
    const adminMobile = configuredAdminMobile()
    try {
      user = await User.create({
        mobile,
        name: name.data,
        email: email.success ? email.data : '',
        role: adminMobile && adminMobile === mobile ? 'admin' : 'user',
        referralCode: makeReferralCode(),
        referredBy: referrer?.referralCode || '',
      })
      await Wallet.create({ userId: user._id })
    } catch (error) {
      if (error.code !== 11000) throw error
      return res.status(409).json({ error: 'An account was just created for this mobile. Sign in instead.' })
    }
  } else {
    const adminMobile = configuredAdminMobile()
    if (adminMobile && adminMobile === mobile && user.role !== 'admin') {
      user.role = 'admin'
      await user.save()
    }
  }

  if (user.status !== 'active') return res.status(403).json({ error: 'This account has been suspended.' })
  await OtpChallenge.updateMany({ mobile, status: 'pending' }, { $set: { status: 'expired' } })
  res.cookie('arvo_session', signSession(user), cookieOptions())
  res.json({ ok: true, user: safeUser(user) })
}))

router.post('/logout', (_req, res) => { res.clearCookie('arvo_session', cookieOptions()); res.json({ ok: true }) })
router.get('/me', requireAuth, asyncRoute(async (req, res) => res.json({ user: safeUser(req.user) })))

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
  res.json({ ok: true, user: safeUser(user) })
}))

export default router
