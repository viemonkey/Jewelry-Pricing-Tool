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

  async findAll(status?: ProductionStatus): Promise<ProductionOrder[]> {
    const filter = status ? { progressStatus: status } : {}
    return this.productionModel
      .find(filter)
      .populate('quote')
      .sort({ createdAt: -1 })
      .lean() as unknown as ProductionOrder[]
  }

  async findOne(id: string): Promise<ProductionOrder> {
    const order = await this.productionModel.findById(id).populate('quote').lean()
    if (!order) throw new NotFoundException(`Production order ${id} không tồn tại`)
    return order as unknown as ProductionOrder
  }

  async create(quoteId: string, deadline: string, assignedTo?: string): Promise<ProductionOrder> {
    await this.quotesService.markInProduction(quoteId)
    const order = new this.productionModel({
      quote: quoteId,
      deadline,
      assignedTo,
      progressStatus: ProductionStatus.PENDING_PRODUCTION,
    })
    await order.save()
    // Fix lỗi null: dùng non-null assertion sau khi đã save thành công
    const saved = await this.productionModel.findById(order._id).populate('quote').lean()
    if (!saved) throw new NotFoundException()
    return saved as unknown as ProductionOrder
  }

  async updateProgress(
    id: string,
    progressStatus: ProductionStatus,
    progressNotes?: string,
    assignedTo?: string,
    deadline?: string,
  ): Promise<ProductionOrder> {
    const update: Record<string, unknown> = { progressStatus }
    if (progressNotes !== undefined) update.progressNotes = progressNotes
    if (assignedTo) update.assignedTo = assignedTo
    if (deadline) update.deadline = deadline

    const order = await this.productionModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('quote')
      .lean()
    if (!order) throw new NotFoundException()
    return order as unknown as ProductionOrder
  }

  async complete(id: string, imageUrls: string[]): Promise<ProductionOrder> {
    const order = await this.productionModel
      .findByIdAndUpdate(
        id,
        { progressStatus: ProductionStatus.COMPLETED, completedImages: imageUrls },
        { new: true },
      )
      .populate('quote')
      .lean()
    if (!order) throw new NotFoundException()
    return order as unknown as ProductionOrder
  }
}
