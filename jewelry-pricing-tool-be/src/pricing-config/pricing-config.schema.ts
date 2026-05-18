import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type PricingConfigDocument = PricingConfig & Document

@Schema({ timestamps: true, collection: 'pricing_config' })
export class PricingConfig {
  @Prop({ type: Object, required: true })
  goldRatios: Array<{
    key: string
    standard: number
    applied: number
    label: string
  }>

  @Prop({ type: Object, required: true })
  profitMargins: Array<{
    maxCost: number
    divisor: number
    margin: string
  }>

  @Prop({ required: true, default: 3 })
  silverMultiplier: number
}

export const PricingConfigSchema = SchemaFactory.createForClass(PricingConfig)
