// src/quotes/quotes.module.ts
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { QuotesController } from './quotes.controller'
import { QuotesService } from './quotes.service'
import { Quote, QuoteSchema } from './quote.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }])],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
