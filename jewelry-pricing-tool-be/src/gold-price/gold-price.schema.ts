import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type GoldPriceDocument = GoldPrice & Document

@Schema({ timestamps: true, collection: 'gold_prices' })
export class GoldPrice {
  @Prop({ required: true }) pricePerChi: number   // VND / chỉ
  @Prop({ required: true }) pricePerGram: number  // VND / gram
  @Prop({ required: true }) effectiveDate: Date
  @Prop({ type: String, enum: ['manual', 'auto'], default: 'manual' }) source: string
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) updatedBy: Types.ObjectId
}

export const GoldPriceSchema = SchemaFactory.createForClass(GoldPrice)
GoldPriceSchema.index({ effectiveDate: -1 })
