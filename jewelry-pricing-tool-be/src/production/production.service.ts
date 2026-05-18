import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ProductionOrder, ProductionDocument, ProductionStatus } from './production.schema'
import { QuotesService } from '../quotes/quotes.service'

@Injectable()
export class ProductionService {
  constructor(
    @InjectModel(ProductionOrder.name)
    private productionModel: Model<ProductionDocument>,
    private quotesService: QuotesService,
  ) {}

  async findAll(status?: ProductionStatus): Promise<any[]> {
    const filter = status ? { progressStatus: status } : {}
    return this.productionModel.find(filter).populate('quote').sort({ createdAt: -1 }).lean()
  }

  async findOne(id: string): Promise<any> {
    const order = await this.productionModel.findById(id).populate('quote').lean()
    if (!order) throw new NotFoundException(`Production order ${id} không tồn tại`)
    return order
  }

  async create(quoteId: string, deadline: string, assignedTo?: string): Promise<any> {
    await this.quotesService.markInProduction(quoteId)

    const year = new Date().getFullYear()
    const count = await this.productionModel.countDocuments()
    const orderCode = `PO-${year}-${String(count + 1).padStart(4, '0')}`

    const order = new this.productionModel({
      orderCode,
      quote: quoteId,
      deadline,
      assignedTo,
      progressStatus: ProductionStatus.PENDING_PRODUCTION,
    })
    await order.save()
    return this.productionModel.findById(order._id).populate('quote').lean()
  }

  async updateProgress(
    id: string,
    progressStatus: ProductionStatus,
    progressNotes?: string,
    assignedTo?: string,
    deadline?: string,
  ): Promise<any> {
    const update: Record<string, unknown> = { progressStatus }
    if (progressNotes !== undefined) update.progressNotes = progressNotes
    if (assignedTo) update.assignedTo = assignedTo
    if (deadline) update.deadline = deadline

    const order = await this.productionModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('quote')
      .lean()
    if (!order) throw new NotFoundException()
    return order
  }

  async complete(id: string, imageUrls: string[]): Promise<any> {
    const order = await this.productionModel
      .findByIdAndUpdate(
        id,
        { progressStatus: ProductionStatus.COMPLETED, completedImages: imageUrls },
        { new: true },
      )
      .populate('quote')
      .lean()
    if (!order) throw new NotFoundException()
    return order
  }
}
