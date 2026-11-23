import mongoose from 'mongoose'
import { AuditLog, LedgerEntry, Wallet } from './models.js'

export async function withTransaction(work) {
  const session = await mongoose.startSession()
  let result
  try {
    await session.withTransaction(async () => { result = await work(session) })
    return result
  } finally {
    await session.endSession()
  }
}

export async function audit(session, actorId, action, targetType, targetId, details = {}) {
  await AuditLog.create([{ actorId, action, targetType, targetId, details }], { session })
}

export async function ledger(session, entry) {
  await LedgerEntry.create([entry], { session })
}

export async function walletFor(userId, session) {
  let wallet = await Wallet.findOne({ userId }).session(session)
  if (!wallet) {
    const created = await Wallet.create([{ userId }], { session })
    wallet = created[0]
  }
  return wallet
}

export function toPaise(value) {
  const raw = String(value ?? '').trim()
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(raw)) return null
  const paise = Math.round(Number(raw) * 100)
  if (!Number.isSafeInteger(paise) || paise <= 0) return null
  return paise
}

export function asRupees(paise = 0) {
  return Number((paise / 100).toFixed(2))
}
