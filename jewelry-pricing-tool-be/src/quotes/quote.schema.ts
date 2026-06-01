import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type QuoteDocument = Quote & Document

export enum QuoteStatus {
  PENDING          = 'PENDING',
  NEED_MORE_INFO   = 'NEED_MORE_INFO',  // NV order trả lại, Sale cần bổ sung
  QUOTING          = 'QUOTING',
  QUOTED           = 'QUOTED',
  SENT_TO_CUSTOMER = 'SENT_TO_CUSTOMER',
  CONFIRMED        = 'CONFIRMED',
  CANCELLED        = 'CANCELLED',
  IN_PRODUCTION    = 'IN_PRODUCTION',
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
}

@Schema({ timestamps: true })
export class Quote {
  @Prop() quoteCode: string

  @Prop({ required: true }) productName: string
  @Prop() productDescription: string

  // Loại sản phẩm (thêm mới theo nghiệp vụ)
  @Prop({ type: String, enum: Object.values(ProductType), default: null })
  productType: string

  @Prop() dimensions: string         // Kích thước / trọng lượng dự kiến
  @Prop() stoneRequirements: string  // Yêu cầu đá / phụ kiện (free-text legacy)
  @Prop({ default: 1 }) quantity: number
  @Prop() deadline: string

  @Prop({ required: true, enum: Object.values(MaterialType) })
  materialType: string

  @Prop() weightChi: number
  @Prop() weightGram: number
  @Prop({ default: 0 }) laborCost: number

  // Snapshot giá vàng tại thời điểm tính (báo giá cũ không bị ảnh hưởng khi giá đổi)
  @Prop({ default: null }) goldPrice24K: number
  @Prop({ default: null }) goldPriceEffectiveDate: Date

  @Prop() materialCost: number
  @Prop() stoneCost: number
  @Prop() costBeforeVAT: number
  @Prop() costWithVAT: number

  // Chi tiết đá (cấu trúc rõ ràng hơn)
  @Prop({ type: [Object], default: [] }) stones: any[]

  @Prop({ default: 0 }) costPrice: number
  @Prop({ default: 0 }) sellingPrice: number
  @Prop() notes: string
  @Prop() rejectReason: string
  @Prop({ type: [String], default: [] }) images: string[]

  @Prop({ type: String, enum: Object.values(QuoteStatus), default: QuoteStatus.PENDING })
  status: QuoteStatus

  @Prop({ required: true }) requestedBy: string
  @Prop() quotedBy: string
}

export const QuoteSchema = SchemaFactory.createForClass(Quote)

// Indexes để tìm kiếm / lọc nhanh
QuoteSchema.index({ status: 1, createdAt: -1 })
QuoteSchema.index({ requestedBy: 1, status: 1 })
