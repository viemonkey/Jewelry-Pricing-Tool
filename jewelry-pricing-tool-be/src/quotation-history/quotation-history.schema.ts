import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type QuotationHistoryDocument = QuotationHistory & Document

@Schema({ timestamps: false, collection: 'quotation_histories' })
export class QuotationHistory {
  @Prop({ type: Types.ObjectId, ref: 'Quote', required: true }) quote: Types.ObjectId
  @Prop() fromStatus: string
  @Prop({ required: true }) toStatus: string
  @Prop() changedBy: string       // username hoặc role
  @Prop({ default: null }) note: string
  @Prop({ default: () => new Date() }) changedAt: Date
}

export const QuotationHistorySchema = SchemaFactory.createForClass(QuotationHistory)
QuotationHistorySchema.index({ quote: 1, changedAt: -1 })
