// src/quotes/quotes.module.ts
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { QuotesController } from './quotes.controller'
import { QuotesService } from './quotes.service'
import { Quote, QuoteSchema } from './quote.schema'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }]),
    NotificationsModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
