import mongoose, { Schema, Document } from 'mongoose'

export interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId
  tokenHash: string
  userAgent?: string
  ip?: string
  expiresAt: Date
  revokedAt?: Date | null
  lastUsedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
UserSessionSchema.index({ userId: 1, revokedAt: 1 })

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema)
