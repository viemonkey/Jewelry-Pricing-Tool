import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { NestExpressApplication } from '@nestjs/platform-express'

// Tạo thư mục uploads TRƯỚC KHI app khởi động
mkdirSync(join(process.cwd(), 'uploads', 'quotes'), { recursive: true })
mkdirSync(join(process.cwd(), 'uploads', 'production'), { recursive: true })

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors({
    origin: process.env.FE_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  // Bỏ whitelist:true để không strip FormData fields
  app.useGlobalPipes(new ValidationPipe({ transform: true }))

  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`🚀 Backend đang chạy tại: http://localhost:${port}`)
}
bootstrap()
