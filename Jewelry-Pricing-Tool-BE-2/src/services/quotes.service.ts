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

    const quote = new Quote({
      ...dto,
      quoteCode,
      images: imageUrls,
      status: QuoteStatus.PENDING,
    })
    return quote.save()
  }

  async updatePrice(id: string, dto: any) {
    const quote = await Quote.findByIdAndUpdate(
      id,
      { ...dto, status: QuoteStatus.QUOTING },
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
    const quote = await this.updateStatus(id, QuoteStatus.CONFIRMED)
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

  async markInProduction(id: string) {
    return this.updateStatus(id, QuoteStatus.IN_PRODUCTION)
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
    const [total, pending, quoted, confirmed] = await Promise.all([
      Quote.countDocuments(),
      Quote.countDocuments({ status: QuoteStatus.PENDING }),
      Quote.countDocuments({ status: QuoteStatus.QUOTED }),
      Quote.countDocuments({ status: QuoteStatus.CONFIRMED }),
    ])
    return { total, pending, quoted, confirmed }
  }
}

export const quotesService = new QuotesService()
