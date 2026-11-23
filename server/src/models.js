import mongoose from 'mongoose'

const { Schema, model } = mongoose

const userSchema = new Schema({
  mobile: { type: String, required: true, unique: true, index: true },
  name: { type: String, trim: true, maxlength: 100, default: '' },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  emailVerifiedAt: { type: Date, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
  profileStatus: { type: String, enum: ['not_started', 'pending', 'verified', 'rejected'], default: 'not_started' },
  referralCode: { type: String, unique: true, index: true },
  referredBy: { type: String, default: '', index: true },
}, { timestamps: true })

const walletSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  availablePaise: { type: Number, default: 0, min: 0 },
  investedPaise: { type: Number, default: 0, min: 0 },
  reservedPaise: { type: Number, default: 0, min: 0 },
}, { timestamps: true })

const planSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 90 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  category: { type: String, trim: true, maxlength: 50, default: 'Investment plan' },
  summary: { type: String, trim: true, maxlength: 500, default: '' },
  details: { type: String, trim: true, maxlength: 10000, default: '' },
  minimumPaise: { type: Number, required: true, min: 1 },
  riskLabel: { type: String, trim: true, maxlength: 80, default: 'See plan documents' },
  termsUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  imageUrl: { type: String, maxlength: 600_000, default: '' },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

const otpChallengeSchema = new Schema({
  mobile: { type: String, required: true, index: true },
  intent: { type: String, enum: ['signup', 'login'], default: 'signup', index: true },
  mode: { type: String, enum: ['demo', 'fast2sms'], required: true },
  status: { type: String, enum: ['pending', 'verified', 'expired'], default: 'pending', index: true },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0 },
}, { timestamps: true })

const emailVerificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true })

const depositSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestKey: { type: String, required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  methodKey: { type: String, required: true, maxlength: 60 },
  paymentReference: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })
depositSchema.index({ userId: 1, requestKey: 1 }, { unique: true })

const withdrawalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestKey: { type: String, required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  payoutNote: { type: String, trim: true, maxlength: 300, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })
withdrawalSchema.index({ userId: 1, requestKey: 1 }, { unique: true })

const transferSchema = new Schema({
  fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestKey: { type: String, required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  note: { type: String, trim: true, maxlength: 160, default: '' },
}, { timestamps: true })
transferSchema.index({ fromUserId: 1, requestKey: 1 }, { unique: true })

const applicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'InvestmentPlan', required: true, index: true },
  requestKey: { type: String, required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })
applicationSchema.index({ userId: 1, requestKey: 1 }, { unique: true })

const ledgerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['deposit', 'withdrawal_hold', 'withdrawal_refund', 'transfer_in', 'transfer_out', 'investment'], required: true },
  direction: { type: String, enum: ['credit', 'debit'], required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['posted', 'reserved', 'reversed'], default: 'posted' },
  referenceType: { type: String, required: true, maxlength: 40 },
  referenceId: { type: Schema.Types.ObjectId, required: true },
  description: { type: String, trim: true, maxlength: 200, default: '' },
}, { timestamps: true })

const planPositionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'InvestmentPlan', required: true },
  applicationId: { type: Schema.Types.ObjectId, ref: 'PlanApplication', required: true, unique: true },
  amountPaise: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },
  startedAt: { type: Date, default: Date.now },
}, { timestamps: true })

const platformSettingsSchema = new Schema({
  key: { type: String, unique: true, default: 'main' },
  paymentMethods: [{ key: String, label: String, instructions: String, active: { type: Boolean, default: false } }],
  languages: [{ type: String }],
  themeIds: [{ type: String }],
  activeTheme: { type: String, enum: ['emerald', 'obsidian', 'ivory', 'sapphire', 'burgundy'], default: 'emerald' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

const auditSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, maxlength: 80 },
  targetType: { type: String, required: true, maxlength: 60 },
  targetId: { type: Schema.Types.ObjectId, default: null },
  details: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })

const contentItemSchema = new Schema({
  type: { type: String, enum: ['news', 'banner', 'work_area', 'about', 'service', 'investor', 'partner', 'social', 'menu', 'logo', 'icon'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
  body: { type: String, trim: true, maxlength: 12000, default: '' },
  imageUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  language: { type: String, trim: true, lowercase: true, maxlength: 12, default: 'en' },
  sortOrder: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })
contentItemSchema.index({ type: 1, slug: 1, language: 1 }, { unique: true })

const supportMessageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderRole: { type: String, enum: ['user', 'admin'], required: true },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  readAt: { type: Date, default: null },
}, { timestamps: true })

export const User = model('User', userSchema)
export const Wallet = model('Wallet', walletSchema)
export const InvestmentPlan = model('InvestmentPlan', planSchema)
export const OtpChallenge = model('OtpChallenge', otpChallengeSchema)
export const EmailVerification = model('EmailVerification', emailVerificationSchema)
export const Deposit = model('Deposit', depositSchema)
export const Withdrawal = model('Withdrawal', withdrawalSchema)
export const Transfer = model('Transfer', transferSchema)
export const PlanApplication = model('PlanApplication', applicationSchema)
export const LedgerEntry = model('LedgerEntry', ledgerSchema)
export const PlanPosition = model('PlanPosition', planPositionSchema)
export const PlatformSettings = model('PlatformSettings', platformSettingsSchema)
export const AuditLog = model('AuditLog', auditSchema)
export const ContentItem = model('ContentItem', contentItemSchema)
export const SupportMessage = model('SupportMessage', supportMessageSchema)
