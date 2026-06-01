import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type StonePriceDocument = StonePrice & Document

export enum StoneType {
  LAB_DIAMOND     = 'LAB_DIAMOND',
  NATURAL_DIAMOND = 'NATURAL_DIAMOND',
  COLORED_STONE   = 'COLORED_STONE',
  CZ              = 'CZ',
  MOISSANITE      = 'MOISSANITE',
}

@Schema({ timestamps: true, collection: 'stone_prices' })
export class StonePrice {
  @Prop({ required: true, enum: Object.values(StoneType) }) stoneType: string
  @Prop({ required: true }) labelVi: string

  @Prop({ type: Object, default: {} })
  spec: {
    size?: string
    color?: string
    clarity?: string
    cut?: string
  }

  @Prop({ required: true }) pricePerUnit: number  // VND
  @Prop({ default: 'viên' }) unit: string
  @Prop({ required: true }) effectiveDate: Date
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) updatedBy: Types.ObjectId
}

export const StonePriceSchema = SchemaFactory.createForClass(StonePrice)
StonePriceSchema.index({ stoneType: 1, effectiveDate: -1 })
