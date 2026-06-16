import mongoose, { Schema, Document } from 'mongoose'

export enum QuoteStatus {
  PENDING          = 'PENDING',
  NEED_MORE_INFO   = 'NEED_MORE_INFO',
  QUOTING          = 'QUOTING',
  QUOTED           = 'QUOTED',
  SENT_TO_CUSTOMER = 'SENT_TO_CUSTOMER',
  CONFIRMED        = 'CONFIRMED',
  CANCELLED        = 'CANCELLED',
}

export enum ProductType {
  RING     = 'RING',
  NECKLACE = 'NECKLACE',
  BRACELET = 'BRACELET',
  ANKLET   = 'ANKLET',
}

export enum MaterialType {
  GOLD_24K   = 'GOLD_24K',
  GOLD_18K   = 'GOLD_18K',
  GOLD_14K   = 'GOLD_14K',
  GOLD_10K   = 'GOLD_10K',
  GOLD_610   = 'GOLD_610',
  SILVER     = 'SILVER',
  PLATINUM   = 'PLATINUM',
}

export interface IQuoteOption {
  materialType: MaterialType
  weightChi?: number
  weightGram?: number
  laborCost: number
  goldPrice24K?: number | null
  platinumPrice?: number | null
  materialCost?: number
  stoneCost?: number
  costBeforeVAT?: number
  costWithVAT?: number
  costPrice: number
  sellingPrice: number
  isCancelled?: boolean
  isConfirmed?: boolean
  budget?: string
}

export interface IQuote extends Document {
  quoteCode?: string
  productName: string
  productDescription?: string
  productType?: ProductType | null
  dimensions?: string
  stoneRequirements?: string
  quantity: number
  deadline?: string
  materialType: MaterialType
  weightChi?: number
  weightGram?: number
  laborCost: number
  goldPrice24K?: number | null
  platinumPrice?: number | null
  goldPriceEffectiveDate?: Date | null
  materialCost?: number
  stoneCost?: number
  costBeforeVAT?: number
  costWithVAT?: number
  stones: any[]
  costPrice: number
  sellingPrice: number
  confirmedPrice?: number
  notes?: string
  rejectReason?: string
  images: string[]
  status: QuoteStatus
  requestedBy: string
  quotedBy?: string
  options?: IQuoteOption[]
  isQuickQuote?: boolean
  gender?: string
  createdAt: Date
  updatedAt: Date
}

const QuoteOptionSchema = new Schema({
  materialType: { type: String, enum: Object.values(MaterialType), required: true },
  weightChi: { type: Number },
  weightGram: { type: Number },
  laborCost: { type: Number, default: 0 },
  goldPrice24K: { type: Number, default: null },
  platinumPrice: { type: Number, default: null },
  materialCost: { type: Number },
  stoneCost: { type: Number },
  costBeforeVAT: { type: Number },
  costWithVAT: { type: Number },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  isCancelled: { type: Boolean, default: false },
  isConfirmed: { type: Boolean, default: false },
  budget: { type: String, default: '' },
}, { _id: false })

const QuoteSchema = new Schema<IQuote>(
  {
    quoteCode: { type: String },
    productName: { type: String, required: true },
    productDescription: { type: String },
    productType: { type: String, enum: Object.values(ProductType), default: null },
    dimensions: { type: String },
    stoneRequirements: { type: String },
    quantity: { type: Number, default: 1 },
    deadline: { type: String },
    materialType: { type: String, required: true, enum: Object.values(MaterialType) },
    weightChi: { type: Number },
    weightGram: { type: Number },
    laborCost: { type: Number, default: 0 },
    goldPrice24K: { type: Number, default: null },
    platinumPrice: { type: Number, default: null },
    goldPriceEffectiveDate: { type: Date, default: null },
    materialCost: { type: Number },
    stoneCost: { type: Number },
    costBeforeVAT: { type: Number },
    costWithVAT: { type: Number },
    stones: { type: [Object], default: [] },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    confirmedPrice: { type: Number },
    notes: { type: String },
    rejectReason: { type: String },
    images: { type: [String], default: [] },
    status: { type: String, enum: Object.values(QuoteStatus), default: QuoteStatus.PENDING },
    requestedBy: { type: String, required: true },
    quotedBy: { type: String },
    options: { type: [QuoteOptionSchema], default: [] },
    isQuickQuote: { type: Boolean, default: false },
    gender: { type: String, default: 'unisex' },
  },
  { timestamps: true }
)

QuoteSchema.index({ status: 1, createdAt: -1 })
QuoteSchema.index({ requestedBy: 1, status: 1 })

export const Quote = mongoose.model<IQuote>('Quote', QuoteSchema)
