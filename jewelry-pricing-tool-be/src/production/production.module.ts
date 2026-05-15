// src/production/production.module.ts
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ProductionController } from './production.controller'
import { ProductionService } from './production.service'
import { ProductionOrder, ProductionSchema } from './production.schema'
import { QuotesModule } from '../quotes/quotes.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProductionOrder.name, schema: ProductionSchema }]),
    QuotesModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class ProductionModule {}
