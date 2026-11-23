const endpoint = 'https://www.fast2sms.com/dev/otp'

function providerConfig() {
  if (!process.env.FAST2SMS_API_KEY || !process.env.FAST2SMS_OTP_ID) {
    const error = new Error('Fast2SMS is not configured. Add FAST2SMS_API_KEY and FAST2SMS_OTP_ID on the server.')
    error.status = 503
    throw error
  }
}

async function request(path, body) {
  providerConfig()
  const response = await fetch(`${endpoint}/${path}`, {
    method: 'POST',
    headers: { Authorization: process.env.FAST2SMS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.message || `Fast2SMS request failed (${response.status}).`)
    error.status = response.status === 401 ? 502 : 400
    throw error
  }
  if (payload.return === false || payload.success === false || payload.status === 'error') {
    const error = new Error(payload.message || 'Fast2SMS could not complete the request.')
    error.status = 400
    throw error
  }
  return payload
}

export function isDemoAuth() {
  return process.env.AUTH_MODE === 'demo' && process.env.NODE_ENV !== 'production'
}

export async function sendOtp(mobile) {
  if (isDemoAuth()) return { mode: 'demo' }
  return request('send', {
    mobile,
    otp_id: process.env.FAST2SMS_OTP_ID,
    otp_expiry: Number(process.env.FAST2SMS_OTP_EXPIRY_MINUTES || 10),
    otp_length: 6,
  })
}

export async function verifyOtp(mobile, otp) {
  if (isDemoAuth()) {
    const expected = process.env.DEMO_OTP || '246810'
    return otp === expected
  }
  await request('verify', { mobile, otp })
  return true
}
