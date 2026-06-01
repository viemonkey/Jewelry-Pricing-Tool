import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { StonePrice, StonePriceSchema } from './stone-price.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: StonePrice.name, schema: StonePriceSchema }])],
  exports: [MongooseModule],
})
export class StonePriceModule {}
