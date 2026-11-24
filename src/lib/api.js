// Use one deployment variable for either the full /api endpoint or Render's service root.
const configuredBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
const API_BASE = configuredBase
  ? (configuredBase.endsWith('/api') ? configuredBase : `${configuredBase}/api`)
  : '/api'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(payload.error || 'The request could not be completed.', response.status)
  return payload
}

export function formatUSDT(valueOrCents, inCents = false) {
  const amount = inCents ? Number(valueOrCents || 0) / 100 : Number(valueOrCents || 0)
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  return `USDT ${formatted}`
}
