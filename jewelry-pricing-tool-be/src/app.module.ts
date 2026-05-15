// src/app.module.ts — CẬP NHẬT từ boilerplate gốc
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { QuotesModule } from './quotes/quotes.module'
import { ProductionModule } from './production/production.module'

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
    // Truy cập qua: http://localhost:3001/uploads/quotes/xxx.jpg
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // ── Feature Modules ─────────────────────────────────────
    QuotesModule,
    ProductionModule,
    // UsersModule,   // TODO Giai đoạn 3 nâng cao
    // AuditModule,   // TODO Giai đoạn 3 nâng cao
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
