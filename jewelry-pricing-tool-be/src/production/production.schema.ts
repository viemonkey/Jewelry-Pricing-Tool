import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types, CallbackWithoutResultAndOptionalError } from 'mongoose'

export type ProductionDocument = ProductionOrder & Document

export enum ProductionStatus {
  PENDING_PRODUCTION = 'PENDING_PRODUCTION',
  CASTING = 'CASTING',
  SETTING_STONES = 'SETTING_STONES',
  POLISHING = 'POLISHING',
  QUALITY_CHECK = 'QUALITY_CHECK',
  COMPLETED = 'COMPLETED',
}

@Schema({ timestamps: true })
export class ProductionOrder {
  @Prop({ required: true, unique: true }) orderCode: string
  @Prop({ type: Types.ObjectId, ref: 'Quote', required: true }) quote: Types.ObjectId
  @Prop({ required: true }) deadline: string
  @Prop() assignedTo: string
  @Prop({ type: String, enum: Object.values(ProductionStatus), default: ProductionStatus.PENDING_PRODUCTION })
  progressStatus: ProductionStatus
  @Prop() progressNotes: string
  @Prop({ type: [String], default: [] }) completedImages: string[]
}

export const ProductionSchema = SchemaFactory.createForClass(ProductionOrder)

ProductionSchema.pre('save', async function (this: ProductionDocument & { orderCode: string; isNew: boolean }, next: CallbackWithoutResultAndOptionalError) {
  if (this.isNew && !this.orderCode) {
    const year = new Date().getFullYear()
    const model = (this as any).constructor
    const count = await model.countDocuments({ orderCode: new RegExp(`^PO-${year}-`) })
    this.orderCode = `PO-${year}-${String(count + 1).padStart(4, '0')}`
  }
  next()
})
