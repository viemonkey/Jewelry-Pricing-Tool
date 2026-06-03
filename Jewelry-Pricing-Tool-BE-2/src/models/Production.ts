import mongoose, { Schema, Document } from 'mongoose'

export enum ProductionStatus {
  PENDING_PRODUCTION = 'PENDING_PRODUCTION',
  CASTING = 'CASTING',
  SETTING_STONES = 'SETTING_STONES',
  POLISHING = 'POLISHING',
  QUALITY_CHECK = 'QUALITY_CHECK',
  COMPLETED = 'COMPLETED',
}

export interface IProductionOrder extends Document {
  orderCode?: string
  quote: mongoose.Types.ObjectId
  deadline: string
  assignedTo?: string
  progressStatus: ProductionStatus
  progressNotes?: string
  completedImages: string[]
  createdAt: Date
  updatedAt: Date
}

const ProductionSchema = new Schema<IProductionOrder>(
  {
    orderCode: { type: String },
    quote: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
    deadline: { type: String, required: true },
    assignedTo: { type: String },
    progressStatus: {
      type: String,
      enum: Object.values(ProductionStatus),
      default: ProductionStatus.PENDING_PRODUCTION,
    },
    progressNotes: { type: String },
    completedImages: { type: [String], default: [] },
  },
  { timestamps: true }
)

export const Production = mongoose.model<IProductionOrder>('Production', ProductionSchema)
