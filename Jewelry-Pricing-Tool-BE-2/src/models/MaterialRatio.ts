import mongoose, { Schema, Document } from 'mongoose'

export enum MaterialKey {
  GOLD_10K   = 'GOLD_10K',
  GOLD_14K   = 'GOLD_14K',
  GOLD_18K   = 'GOLD_18K',
  GOLD_24K   = 'GOLD_24K',
  GOLD_610   = 'GOLD_610',
  SILVER_925 = 'SILVER',
  PLATINUM   = 'PLATINUM',
}

export interface IMaterialRatio extends Document {
  material: string
  labelVi: string
  ratio: number
  unit: string
  isSpecialRule: boolean
  specialRuleNote: string | null
  createdAt: Date
  updatedAt: Date
}

const MaterialRatioSchema = new Schema<IMaterialRatio>(
  {
    material: { type: String, required: true, unique: true, enum: Object.values(MaterialKey) },
    labelVi: { type: String, required: true },
    ratio: { type: Number, required: true },
    unit: { type: String, enum: ['chi', 'gram'], default: 'chi' },
    isSpecialRule: { type: Boolean, default: false },
    specialRuleNote: { type: String, default: null },
  },
  { timestamps: true, collection: 'material_ratios' }
)

export const MaterialRatio = mongoose.model<IMaterialRatio>('MaterialRatio', MaterialRatioSchema)
