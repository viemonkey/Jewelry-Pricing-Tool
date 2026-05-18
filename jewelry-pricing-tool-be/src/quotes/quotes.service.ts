import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Quote, QuoteDocument, QuoteStatus } from './quote.schema'
import { CreateQuoteDto } from './dto/create-quote.dto'
import { UpdateQuotePriceDto } from './dto/update-quote-price.dto'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(status?: QuoteStatus): Promise<any[]> {
    const filter = status ? { status } : {}
    return this.quoteModel.find(filter).sort({ createdAt: -1 }).lean()
  }

  async findOne(id: string): Promise<any> {
    const quote = await this.quoteModel.findById(id).lean()
    if (!quote) throw new NotFoundException(`Quote ${id} không tồn tại`)
    return quote
  }

  async create(dto: CreateQuoteDto, imageUrls: string[]): Promise<any> {
    // Tự generate quoteCode trong service — tránh hoàn toàn pre-hook
    const year = new Date().getFullYear()
    const count = await this.quoteModel.countDocuments()
    const quoteCode = `QT-${year}-${String(count + 1).padStart(4, '0')}`

    const quote = new this.quoteModel({
      ...dto,
      quoteCode,
      images: imageUrls,
      status: QuoteStatus.PENDING,
    })
    return quote.save()
  }

  async updatePrice(id: string, dto: UpdateQuotePriceDto): Promise<any> {
    const quote = await this.quoteModel
      .findByIdAndUpdate(id, { ...dto, status: QuoteStatus.QUOTING }, { new: true })
      .lean()
    if (!quote) throw new NotFoundException()
    return quote
  }

  async startQuoting(id: string): Promise<any> {
    return this.updateStatus(id, QuoteStatus.QUOTING)
  }

  async rejectQuote(id: string, reason: string): Promise<any> {
    const quote = await this.quoteModel.findByIdAndUpdate(
      id,
      { status: QuoteStatus.NEED_MORE_INFO, rejectReason: reason },
      { new: true }
    ).lean()
    if (!quote) throw new NotFoundException()
    this.notificationsService.notifyQuoteRejected(
      quote.quoteCode,
      quote.productName,
      String(quote._id),
      reason,
    )
    return quote
  }

  async updateInfo(id: string, data: { dimensions?: string; stoneRequirements?: string; productDescription?: string; notes?: string; images?: string[] }): Promise<any> {
    const quote = await this.quoteModel.findByIdAndUpdate(id, { ...data }, { new: true }).lean()
    if (!quote) throw new NotFoundException()
    return quote
  }

  async resubmit(id: string): Promise<any> {
    // Sale đã bổ sung xong → quay lại PENDING, xoá rejectReason
    const quote = await this.quoteModel.findByIdAndUpdate(
      id,
      { status: QuoteStatus.PENDING, rejectReason: '' },
      { new: true }
    ).lean()
    if (!quote) throw new NotFoundException()
    // Thông báo NV order biết có yêu cầu mới cần xử lý
    this.notificationsService.emit({
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

  async completeQuoting(id: string): Promise<any> {
    const quote = await this.updateStatus(id, QuoteStatus.QUOTED)
    this.notificationsService.notifyQuoteCompleted(
      quote.quoteCode,
      quote.productName,
      String(quote._id),
      quote.sellingPrice ?? 0,
    )
    return quote
  }

  async sentToCustomer(id: string): Promise<any> {
    const quote = await this.updateStatus(id, QuoteStatus.SENT_TO_CUSTOMER)
    // Thông báo NV order biết Sale đã gửi giá cho khách
    this.notificationsService.emit({
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

  async confirm(id: string): Promise<any> {
    const quote = await this.updateStatus(id, QuoteStatus.CONFIRMED)
    // Thông báo NV order biết khách đặt hàng
    this.notificationsService.notifyQuoteConfirmed(
      quote.quoteCode,
      quote.productName,
      String(quote._id),
    )
    return quote
  }

  async cancel(id: string): Promise<any> {
    const quote = await this.updateStatus(id, QuoteStatus.CANCELLED)
    // Thông báo NV order biết bị huỷ
    this.notificationsService.notifyQuoteCancelled(
      quote.quoteCode,
      quote.productName,
      String(quote._id),
    )
    return quote
  }

  async markInProduction(id: string): Promise<any> {
    return this.updateStatus(id, QuoteStatus.IN_PRODUCTION)
  }

  private async updateStatus(id: string, status: QuoteStatus): Promise<any> {
    const quote = await this.quoteModel.findByIdAndUpdate(id, { status }, { new: true }).lean()
    if (!quote) throw new NotFoundException()
    return quote
  }

  async getStats(): Promise<{ total: number; pending: number; quoted: number; confirmed: number }> {
    const [total, pending, quoted, confirmed] = await Promise.all([
      this.quoteModel.countDocuments(),
      this.quoteModel.countDocuments({ status: QuoteStatus.PENDING }),
      this.quoteModel.countDocuments({ status: QuoteStatus.QUOTED }),
      this.quoteModel.countDocuments({ status: QuoteStatus.CONFIRMED }),
    ])
    return { total, pending, quoted, confirmed }
  }
}
