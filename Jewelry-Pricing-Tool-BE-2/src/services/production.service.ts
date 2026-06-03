import { Production, ProductionStatus } from '../models/Production'
import { quotesService } from './quotes.service'

export class ProductionService {
  async findAll(status?: ProductionStatus) {
    const filter = status ? { progressStatus: status } : {}
    return Production.find(filter).populate('quote').sort({ createdAt: -1 }).lean()
  }

  async findOne(id: string) {
    const order = await Production.findById(id).populate('quote').lean()
    if (!order) {
      const err = new Error(`Production order ${id} không tồn tại`)
      ;(err as any).statusCode = 404
      throw err
    }
    return order
  }

  async create(quoteId: string, deadline: string, assignedTo?: string) {
    await quotesService.markInProduction(quoteId)

    const year = new Date().getFullYear()
    const count = await Production.countDocuments()
    const orderCode = `PO-${year}-${String(count + 1).padStart(4, '0')}`

    const order = new Production({
      orderCode,
      quote: quoteId,
      deadline,
      assignedTo,
      progressStatus: ProductionStatus.PENDING_PRODUCTION,
    })
    await order.save()
    return Production.findById(order._id).populate('quote').lean()
  }

  async updateProgress(
    id: string,
    progressStatus: ProductionStatus,
    progressNotes?: string,
    assignedTo?: string,
    deadline?: string
  ) {
    const update: Record<string, unknown> = { progressStatus }
    if (progressNotes !== undefined) update.progressNotes = progressNotes
    if (assignedTo) update.assignedTo = assignedTo
    if (deadline) update.deadline = deadline

    const order = await Production.findByIdAndUpdate(id, update, { new: true })
      .populate('quote')
      .lean()
    if (!order) {
      const err = new Error('Production order not found')
      ;(err as any).statusCode = 404
      throw err
    }
    return order
  }

  async complete(id: string, imageUrls: string[]) {
    const order = await Production.findByIdAndUpdate(
      id,
      { progressStatus: ProductionStatus.COMPLETED, completedImages: imageUrls },
      { new: true }
    )
      .populate('quote')
      .lean()
    if (!order) {
      const err = new Error('Production order not found')
      ;(err as any).statusCode = 404
      throw err
    }
    return order
  }
}

export const productionService = new ProductionService()
