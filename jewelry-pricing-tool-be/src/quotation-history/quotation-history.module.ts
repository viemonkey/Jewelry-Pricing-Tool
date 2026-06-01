import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { QuotationHistory, QuotationHistorySchema } from './quotation-history.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: QuotationHistory.name, schema: QuotationHistorySchema }])],
  exports: [MongooseModule],
})
export class QuotationHistoryModule {}
