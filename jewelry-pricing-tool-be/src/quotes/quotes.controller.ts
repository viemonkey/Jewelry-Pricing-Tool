import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { QuotesService } from './quotes.service'
import { CreateQuoteDto } from './dto/create-quote.dto'
import { UpdateQuotePriceDto } from './dto/update-quote-price.dto'
import type { QuoteStatus } from './quote.schema'

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.quotesService.findAll(status as QuoteStatus)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id)
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: diskStorage({
        // Dùng absolute path thay vì relative './uploads/quotes'
        destination: join(process.cwd(), 'uploads', 'quotes'),
        filename: (_, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `${unique}${extname(file.originalname)}`)
        },
      }),
    }),
  )
  create(
    @Body() dto: CreateQuoteDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imageUrls = (files || []).map((f) => `/uploads/quotes/${f.filename}`)
    return this.quotesService.create(dto, imageUrls)
  }

  @Patch(':id/price')
  updatePrice(@Param('id') id: string, @Body() dto: UpdateQuotePriceDto) {
    return this.quotesService.updatePrice(id, dto)
  }

  @Patch(':id/complete-quoting')
  completeQuoting(@Param('id') id: string) {
    return this.quotesService.completeQuoting(id)
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.quotesService.confirm(id)
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.quotesService.cancel(id)
  }
}
