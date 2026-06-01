import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type MaterialRatioDocument = MaterialRatio & Document

export enum MaterialKey {
  GOLD_10K   = 'GOLD_10K',
  GOLD_14K   = 'GOLD_14K',
  GOLD_18K   = 'GOLD_18K',
  GOLD_24K   = 'GOLD_24K',
  GOLD_610   = 'GOLD_610',
  SILVER_925 = 'SILVER',
}

@Schema({ timestamps: true, collection: 'material_ratios' })
export class MaterialRatio {
  @Prop({ required: true, unique: true, enum: Object.values(MaterialKey) })
  material: string

  @Prop({ required: true }) labelVi: string       // "Vàng 10K", "Bạc 925"
  @Prop({ required: true }) ratio: number         // Tỉ lệ áp dụng
  @Prop({ type: String, enum: ['chi', 'gram'], default: 'chi' }) unit: string

  // Quy tắc đặc biệt cho Bạc
  @Prop({ default: false }) isSpecialRule: boolean
  @Prop({ default: null })  specialRuleNote: string
}

export const MaterialRatioSchema = SchemaFactory.createForClass(MaterialRatio)
