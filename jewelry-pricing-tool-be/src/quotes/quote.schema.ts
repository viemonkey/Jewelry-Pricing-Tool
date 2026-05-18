import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

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
export class Quote {
  @Prop() quoteCode: string           // không required, không unique index ở đây
  @Prop({ required: true }) productName: string
  @Prop() productDescription: string
  @Prop() dimensions: string         // Kích thước / trọng lượng dự kiến
  @Prop() stoneRequirements: string  // Yêu cầu đá / phụ kiện
  @Prop({ default: 1 }) quantity: number
  @Prop() deadline: string           // Deadline khách yêu cầu
  @Prop({ required: true, enum: ['GOLD_24K', 'GOLD_18K', 'GOLD_14K', 'GOLD_10K', 'SILVER'] })
  materialType: string
  @Prop() weightChi: number
  @Prop() weightGram: number
  @Prop({ default: 0 }) laborCost: number
  @Prop({ type: [Object], default: [] }) stones: any[]
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
