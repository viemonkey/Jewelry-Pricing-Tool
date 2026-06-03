import mongoose, { Schema, Document } from 'mongoose'

export enum StoneType {
  LAB_DIAMOND     = 'LAB_DIAMOND',
  NATURAL_DIAMOND = 'NATURAL_DIAMOND',
  COLORED_STONE   = 'COLORED_STONE',
  CZ              = 'CZ',
  MOISSANITE      = 'MOISSANITE',
}

export interface IStonePrice extends Document {
  stoneType: string
  labelVi: string
  spec: {
    size?: string
    color?: string
    clarity?: string
    cut?: string
  }
  pricePerUnit: number
  unit: string
  effectiveDate: Date
  updatedBy: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const StonePriceSchema = new Schema<IStonePrice>(
  {
    stoneType: { type: String, required: true, enum: Object.values(StoneType) },
    labelVi: { type: String, required: true },
    spec: {
      type: {
        size: { type: String },
        color: { type: String },
        clarity: { type: String },
        cut: { type: String },
      },
      default: {},
      _id: false,
    },
    pricePerUnit: { type: Number, required: true },
    unit: { type: String, default: 'viên' },
    effectiveDate: { type: Date, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'stone_prices' }
)

StonePriceSchema.index({ stoneType: 1, effectiveDate: -1 })

export const StonePrice = mongoose.model<IStonePrice>('StonePrice', StonePriceSchema)
