import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)

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

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(stored, password) {
  if (typeof stored !== 'string') return false
  const [salt, encoded] = stored.split(':')
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(encoded || '')) return false
  const expected = Buffer.from(encoded, 'hex')
  const actual = await scrypt(password, salt, expected.length)
  return crypto.timingSafeEqual(expected, actual)
}

export async function hashMpin(mpin) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = await scrypt(mpin, salt, 64)
  return `${salt}:${derived.toString('hex')}`
}

export async function verifyMpin(stored, mpin) {
  if (typeof stored !== 'string') return false
  const [salt, encoded] = stored.split(':')
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(encoded || '')) return false
  const expected = Buffer.from(encoded, 'hex')
  const actual = await scrypt(mpin, salt, expected.length)
  return crypto.timingSafeEqual(expected, actual)
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
    mpinSet: Boolean(user.mpinHash),
    referralCode: user.referralCode,
    createdAt: user.createdAt,
  }
}
