import { User } from './models.js'
import { verifySession } from './security.js'

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.arvo_session
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' })
    const payload = verifySession(token)
    const user = await User.findById(payload.sub)
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'This account is unavailable.' })
    req.user = user
    next()
  } catch {
    res.clearCookie('arvo_session', cookieOptions())
    res.status(401).json({ error: 'Your session has expired. Sign in again.' })
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' })
  next()
}

export function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 }
}

export function originGuard(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next()
  const origin = req.get('origin')
  const allowed = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  if (origin && origin !== allowed) return res.status(403).json({ error: 'Request origin is not allowed.' })
  next()
}
