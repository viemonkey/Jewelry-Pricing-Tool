import mongoose, { Schema, Document } from 'mongoose'

export interface IGoldRatio {
  key: string
  standard: number
  applied: number
  label: string
}

export interface IProfitMargin {
  maxCost: number
  divisor: number
  margin: string
}

export interface IPricingConfig extends Document {
  goldRatios: IGoldRatio[]
  profitMargins: IProfitMargin[]
  silverMultiplier: number
  goldPrice24K: number
  platinumPrice: number
  createdAt: Date
  updatedAt: Date
}

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    goldRatios: {
      type: [
        {
          key: { type: String, required: true },
          standard: { type: Number, required: true },
          applied: { type: Number, required: true },
          label: { type: String, required: true },
          _id: false,
        },
      ],
      required: true,
    },
    profitMargins: {
      type: [
        {
          maxCost: { type: Number, required: true },
          divisor: { type: Number, required: true },
          margin: { type: String, required: true },
          _id: false,
        },
      ],
      required: true,
    },
    silverMultiplier: { type: Number, required: true, default: 3 },
    goldPrice24K: { type: Number, required: true, default: 9000000 },
    platinumPrice: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: 'pricing_config' }
)

export const PricingConfig = mongoose.model<IPricingConfig>('PricingConfig', PricingConfigSchema)
