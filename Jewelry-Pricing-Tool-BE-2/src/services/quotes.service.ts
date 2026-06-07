import { Quote, QuoteStatus } from '../models/Quote'
import { notificationsService } from './notifications.service'

export class QuotesService {
  async findAll(status?: QuoteStatus) {
    const filter = status ? { status } : {}
    return Quote.find(filter).sort({ createdAt: -1 }).lean()
  }

  async findOne(id: string) {
    const quote = await Quote.findById(id).lean()
    if (!quote) {
      const err = new Error(`Quote ${id} không tồn tại`)
      ;(err as any).statusCode = 404
      throw err
    }
    return quote
  }

  async create(dto: any, imageUrls: string[]) {
    const year = new Date().getFullYear()
    const count = await Quote.countDocuments()
    const quoteCode = `QT-${year}-${String(count + 1).padStart(4, '0')}`

    let options = []
    if (dto.options) {
      try {
        options = typeof dto.options === 'string' ? JSON.parse(dto.options) : dto.options
      } catch (err) {}
    }

    const quote = new Quote({
      ...dto,
      options,
      quoteCode,
      images: imageUrls,
      status: QuoteStatus.PENDING,
    })
    return quote.save()
  }

  async updatePrice(id: string, dto: any) {
    const updateData = { ...dto }
    
    // Backwards compatibility: populate top-level fields from the first option
    if (dto.options && Array.isArray(dto.options) && dto.options.length > 0) {
      const firstOpt = dto.options[0]
      updateData.materialType = firstOpt.materialType
      updateData.weightChi = firstOpt.weightChi
      updateData.weightGram = firstOpt.weightGram
      updateData.laborCost = firstOpt.laborCost
      updateData.goldPrice24K = firstOpt.goldPrice24K
      updateData.materialCost = firstOpt.materialCost
      updateData.stoneCost = firstOpt.stoneCost
      updateData.costBeforeVAT = firstOpt.costBeforeVAT
      updateData.costPrice = firstOpt.costPrice
      updateData.sellingPrice = firstOpt.sellingPrice
    }

    const quote = await Quote.findByIdAndUpdate(
      id,
      { ...updateData, status: QuoteStatus.QUOTING },
      { new: true }
    ).lean()
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }
    return quote
  }

  async startQuoting(id: string) {
    return this.updateStatus(id, QuoteStatus.QUOTING)
  }

  async rejectQuote(id: string, reason: string) {
    const quote = await Quote.findByIdAndUpdate(
      id,
      { status: QuoteStatus.NEED_MORE_INFO, rejectReason: reason },
      { new: true }
    ).lean()
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }
    notificationsService.notifyQuoteRejected(
      quote.quoteCode || '',
      quote.productName,
      String(quote._id),
      reason
    )
    return quote
  }

  async updateInfo(id: string, data: any) {
    const quote = await Quote.findByIdAndUpdate(id, { ...data }, { new: true }).lean()
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }
    return quote
  }

  async resubmit(id: string) {
    const quote = await Quote.findByIdAndUpdate(
      id,
      { status: QuoteStatus.PENDING, rejectReason: '' },
      { new: true }
    ).lean()
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }
    notificationsService.emit({
      type: 'QUOTE_REJECTED',
      targetRole: 'order',
      title: '🔄 Sale đã bổ sung thông tin',
      message: `"${quote.productName}" (${quote.quoteCode}) đã được Sale cập nhật, sẵn sàng báo giá`,
      quoteId: String(quote._id),
      quoteCode: quote.quoteCode,
      productName: quote.productName,
    })
    return quote
  }

  async completeQuoting(id: string) {
    const quote = await this.updateStatus(id, QuoteStatus.QUOTED)
    notificationsService.notifyQuoteCompleted(
      quote.quoteCode || '',
      quote.productName,
      String(quote._id),
      quote.sellingPrice ?? 0
    )
    return quote
  }

  async sentToCustomer(id: string) {
    const quote = await this.updateStatus(id, QuoteStatus.SENT_TO_CUSTOMER)
    notificationsService.emit({
      type: 'QUOTE_COMPLETED',
      targetRole: 'order',
      title: '📤 Sale đã gửi giá cho khách',
      message: `"${quote.productName}" (${quote.quoteCode}) đã được gửi báo giá cho khách hàng`,
      quoteId: String(quote._id),
      quoteCode: quote.quoteCode,
      productName: quote.productName,
    })
    return quote
  }

  async confirm(id: string) {
    const currentQuote = await Quote.findById(id).lean()
    if (!currentQuote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }

    const quote = await Quote.findByIdAndUpdate(
      id,
      { 
        status: QuoteStatus.CONFIRMED,
        confirmedPrice: currentQuote.sellingPrice || 0
      },
      { new: true }
    ).lean()

    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }

    notificationsService.notifyQuoteConfirmed(
      quote.quoteCode || '',
      quote.productName,
      String(quote._id)
    )
    return quote
  }

  async cancel(id: string) {
    const quote = await this.updateStatus(id, QuoteStatus.CANCELLED)
    notificationsService.notifyQuoteCancelled(
      quote.quoteCode || '',
      quote.productName,
      String(quote._id)
    )
    return quote
  }



  private async updateStatus(id: string, status: QuoteStatus) {
    const quote = await Quote.findByIdAndUpdate(id, { status }, { new: true }).lean()
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }
    return quote
  }

  async getStats() {
    const [total, pending, quoted, confirmed, revenueResult] = await Promise.all([
      Quote.countDocuments(),
      Quote.countDocuments({ status: QuoteStatus.PENDING }),
      Quote.countDocuments({ status: QuoteStatus.QUOTED }),
      Quote.countDocuments({ status: QuoteStatus.CONFIRMED }),
      Quote.aggregate([
        { $match: { status: QuoteStatus.CONFIRMED } },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$confirmedPrice', '$sellingPrice'] },
                  '$quantity',
                ],
              },
            },
          },
        },
      ]),
    ])
    const confirmedRevenue = revenueResult[0]?.totalRevenue || 0
    return { total, pending, quoted, confirmed, confirmedRevenue }
  }
}

export const quotesService = new QuotesService()
