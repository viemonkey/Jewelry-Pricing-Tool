import mongoose, { Schema, Document } from 'mongoose'

export type UserRole = 'sale' | 'order'
export type UserStatus = 'active' | 'pending' | 'disabled'

export interface IUser extends Document {
  fullName: string
  username: string
  email?: string
  phone?: string
  passwordHash: string
  role: UserRole
  status: UserStatus
  avatarUrl?: string
  mustChangePassword: boolean
  failedLoginAttempts: number
  lockedUntil?: Date | null
  lastLoginAt?: Date | null
  passwordChangedAt?: Date | null
  createdBy?: mongoose.Types.ObjectId | null
  updatedBy?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['sale', 'order'], required: true, default: 'sale' },
    status: { type: String, enum: ['active', 'pending', 'disabled'], required: true, default: 'active' },
    avatarUrl: { type: String },
    mustChangePassword: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

UserSchema.index({ role: 1, status: 1 })
UserSchema.index({ createdAt: -1 })

export const User = mongoose.model<IUser>('User', UserSchema)
