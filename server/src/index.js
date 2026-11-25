import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import adminRoutes from './routes/admin.js'
import { ContentItem, PlatformSettings } from './models.js'
import { originGuard } from './middleware.js'

const app = express()
const port = Number(process.env.PORT || 4000)
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.disable('x-powered-by')
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }))
app.use(cors({ origin: clientOrigin, credentials: true, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] }))
app.use(express.json({ limit: '700kb' }))
app.use(cookieParser())
app.use(originGuard)

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'arvo-api' }))
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', userRoutes)
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }))

app.use((error, _req, res, _next) => {
  if (error?.code === 'OTP_PROVIDER_NOT_CONFIGURED') {
    console.error('[arvo-api]', error.message)
    return res.status(503).json({ error: 'SMS verification is unavailable right now. Please contact Arvo support.' })
  }
  if (error?.code === 11000) return res.status(409).json({ error: 'That value is already in use.' })
  if (error?.name === 'ValidationError') return res.status(400).json({ error: 'Please check the submitted information.' })
  if (error?.name === 'CastError') return res.status(400).json({ error: 'Invalid record identifier.' })
  const status = Number(error?.status) || 500
  if (status >= 500) console.error('[arvo-api]', error?.message || 'Internal server error')
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.message })
})

async function start() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error('Set a JWT_SECRET with at least 32 characters before production startup.')
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before starting the API.')
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  await PlatformSettings.updateOne({ key: 'main' }, { $setOnInsert: { languages: ['en'], themeIds: ['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy'], activeTheme: 'emerald', paymentMethods: [] } }, { upsert: true })
  const welcomePopup = await ContentItem.exists({ type: 'announcement_popup', language: 'en' })
  if (!welcomePopup) await ContentItem.create({ type: 'announcement_popup', title: 'Welcome to Arvo', slug: 'arvo-welcome', body: 'Explore your Arvo account, discover available plans and check back here for the latest updates.', imageUrl: '', language: 'en', sortOrder: 0, isPublished: true, metadata: { eyebrow: 'ARVO · LATEST NEWS', buttonLabel: 'Continue', url: '' } })
  app.listen(port, () => console.log(`Arvo API listening on port ${port}`))
}

start().catch((error) => {
  console.error(`[arvo-api] ${error.message}`)
  process.exit(1)
})
