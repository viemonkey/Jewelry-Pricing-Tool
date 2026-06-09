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
      updateData.costWithVAT = firstOpt.costWithVAT
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

  async confirm(id: string, selectedOption?: any) {
    const quote = await Quote.findById(id)
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }

    quote.status = QuoteStatus.CONFIRMED
    quote.confirmedPrice = selectedOption ? selectedOption.sellingPrice : (quote.sellingPrice || 0)

    if (selectedOption) {
      quote.materialType = selectedOption.materialType
      quote.weightChi = selectedOption.weightChi
      quote.weightGram = selectedOption.weightGram
      quote.laborCost = selectedOption.laborCost
      quote.goldPrice24K = selectedOption.goldPrice24K
      quote.materialCost = selectedOption.materialCost
      quote.stoneCost = selectedOption.stoneCost
      quote.costBeforeVAT = selectedOption.costBeforeVAT
      quote.costWithVAT = selectedOption.costWithVAT
      quote.costPrice = selectedOption.costPrice
      quote.sellingPrice = selectedOption.sellingPrice

      if (quote.options && quote.options.length > 0) {
        const option = quote.options.find(o => o.materialType === selectedOption.materialType)
        if (option) {
          option.isConfirmed = true
        }
      }
    }

    const saved = await quote.save()
    const result = saved.toObject()

    notificationsService.notifyQuoteConfirmed(
      result.quoteCode || '',
      result.productName,
      String(result._id)
    )
    return result
  }

  async cancel(id: string, materialType?: string) {
    const quote = await Quote.findById(id)
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }

    if (materialType && quote.options && quote.options.length > 0) {
      const option = quote.options.find(o => o.materialType === materialType)
      if (option) {
        option.isCancelled = true
      }
      const allCancelled = quote.options.every(o => o.isCancelled)
      if (allCancelled) {
        quote.status = QuoteStatus.CANCELLED
      }
    } else {
      quote.status = QuoteStatus.CANCELLED
      if (quote.options && quote.options.length > 0) {
        quote.options.forEach(o => {
          o.isCancelled = true
        })
      }
    }

    const saved = await quote.save()
    const result = saved.toObject()

    if (result.status === QuoteStatus.CANCELLED) {
      notificationsService.notifyQuoteCancelled(
        result.quoteCode || '',
        result.productName,
        String(result._id)
      )
    }
    return result
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
