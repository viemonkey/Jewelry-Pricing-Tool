// src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { AppController } from './app.controller'
import { AppService } from './app.service'

// ── Feature Modules (gốc) ────────────────────────────────────
import { QuotesModule } from './quotes/quotes.module'
import { ProductionModule } from './production/production.module'
import { PricingConfigModule } from './pricing-config/pricing-config.module'
import { NotificationsModule } from './notifications/notifications.module'

// ── Feature Modules (mới – từ phân tích nghiệp vụ VCB) ──────
import { GoldPriceModule } from './gold-price/gold-price.module'
import { MaterialRatioModule } from './material-ratio/material-ratio.module'
import { StonePriceModule } from './stone-price/stone-price.module'
import { QuotationHistoryModule } from './quotation-history/quotation-history.module'

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── MongoDB ─────────────────────────────────────────────
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // ── Serve uploaded files statically ─────────────────────
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // ── Feature Modules (gốc) ────────────────────────────────
    QuotesModule,
    ProductionModule,
    PricingConfigModule,
    NotificationsModule,

    // ── Feature Modules (mới) ────────────────────────────────
    GoldPriceModule,       // Lịch sử giá vàng 24K
    MaterialRatioModule,   // Tỉ lệ vàng theo tuổi
    StonePriceModule,      // Bảng giá đá / phụ kiện
    QuotationHistoryModule, // Lịch sử thay đổi trạng thái báo giá
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
