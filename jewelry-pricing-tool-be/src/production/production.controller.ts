import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { ProductionService } from './production.service'
import type { ProductionStatus } from './production.schema'

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.productionService.findAll(status as ProductionStatus)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(id)
  }

  @Post()
  create(
    @Body() body: { quoteId: string; deadline: string; assignedTo?: string },
  ) {
    return this.productionService.create(body.quoteId, body.deadline, body.assignedTo)
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Body() body: { progressStatus: string; progressNotes?: string; assignedTo?: string; deadline?: string },
  ) {
    return this.productionService.updateProgress(
      id,
      body.progressStatus as ProductionStatus,
      body.progressNotes,
      body.assignedTo,
      body.deadline,
    )
  }

  @Patch(':id/complete')
  @UseInterceptors(
    FilesInterceptor('completedImages', 8, {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'production'),
        filename: (_, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `${unique}${extname(file.originalname)}`)
        },
      }),
    }),
  )
  complete(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imageUrls = (files || []).map((f) => `/uploads/production/${f.filename}`)
    return this.productionService.complete(id, imageUrls)
  }
}
