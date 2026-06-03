import mongoose, { Schema, Document } from 'mongoose'

export interface IGoldPrice extends Document {
  pricePerChi: number
  pricePerGram: number
  effectiveDate: Date
  source: string
  updatedBy: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const GoldPriceSchema = new Schema<IGoldPrice>(
  {
    pricePerChi: { type: Number, required: true },
    pricePerGram: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    source: { type: String, enum: ['manual', 'auto'], default: 'manual' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'gold_prices' }
)

GoldPriceSchema.index({ effectiveDate: -1 })

export const GoldPrice = mongoose.model<IGoldPrice>('GoldPrice', GoldPriceSchema)
