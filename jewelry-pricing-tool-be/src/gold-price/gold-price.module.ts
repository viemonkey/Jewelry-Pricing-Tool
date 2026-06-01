import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { GoldPrice, GoldPriceSchema } from './gold-price.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: GoldPrice.name, schema: GoldPriceSchema }])],
  exports: [MongooseModule],
})
export class GoldPriceModule {}
