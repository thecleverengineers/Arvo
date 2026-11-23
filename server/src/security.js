import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const fallback = 'local-development-only-do-not-use-in-production-arvo-secret'
function getJwtSecret() {
  return process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : fallback)
}

export function signSession(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), { expiresIn: '30d', issuer: 'arvo-api', audience: 'arvo-app' })
}

export function verifySession(token) {
  return jwt.verify(token, getJwtSecret(), { issuer: 'arvo-api', audience: 'arvo-app' })
}

export function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function makeReferralCode() {
  return `ARVO${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

export function safeUser(user) {
  return {
    id: user._id.toString(),
    mobile: user.mobile,
    name: user.name || '',
    email: user.email || '',
    emailVerified: Boolean(user.emailVerifiedAt),
    role: user.role,
    status: user.status,
    profileStatus: user.profileStatus,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
  }
}
