import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types, CallbackWithoutResultAndOptionalError } from 'mongoose'

export type QuoteDocument = Quote & Document

export enum QuoteStatus {
  PENDING = 'PENDING',
  QUOTING = 'QUOTING',
  QUOTED = 'QUOTED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  IN_PRODUCTION = 'IN_PRODUCTION',
}

@Schema({ timestamps: true })
export class StoneDetail {
  @Prop({ required: true }) name: string
  @Prop({ required: true }) quantity: number
  @Prop({ required: true }) pricePerUnit: number
  @Prop({ required: true }) totalPrice: number
}

@Schema({ timestamps: true })
export class Quote {
  @Prop({ required: true, unique: true }) quoteCode: string
  @Prop({ required: true }) productName: string
  @Prop() productDescription: string
  @Prop({ required: true, enum: ['GOLD_24K', 'GOLD_18K', 'GOLD_14K', 'GOLD_10K', 'SILVER'] })
  materialType: string
  @Prop() weightChi: number
  @Prop() weightGram: number
  @Prop({ default: 0 }) laborCost: number
  @Prop({ type: [Object], default: [] }) stones: StoneDetail[]
  @Prop({ default: 0 }) costPrice: number
  @Prop({ default: 0 }) sellingPrice: number
  @Prop() notes: string
  @Prop({ type: [String], default: [] }) images: string[]
  @Prop({ type: String, enum: Object.values(QuoteStatus), default: QuoteStatus.PENDING })
  status: QuoteStatus
  @Prop({ required: true }) requestedBy: string
  @Prop() quotedBy: string
}

export const QuoteSchema = SchemaFactory.createForClass(Quote)

QuoteSchema.pre('save', async function (this: QuoteDocument & { quoteCode: string; isNew: boolean }, next: CallbackWithoutResultAndOptionalError) {
  if (this.isNew && !this.quoteCode) {
    const year = new Date().getFullYear()
    const model = (this as any).constructor
    const count = await model.countDocuments({ quoteCode: new RegExp(`^QT-${year}-`) })
    this.quoteCode = `QT-${year}-${String(count + 1).padStart(4, '0')}`
  }
  next()
})
