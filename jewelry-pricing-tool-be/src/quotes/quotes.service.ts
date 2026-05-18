import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Quote, QuoteDocument, QuoteStatus } from './quote.schema'
import { CreateQuoteDto } from './dto/create-quote.dto'
import { UpdateQuotePriceDto } from './dto/update-quote-price.dto'

@Injectable()
export class QuotesService {
  constructor(@InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>) {}

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
    // Trả lại PENDING kèm ghi chú lý do vào notes
    const quote = await this.quoteModel.findByIdAndUpdate(
      id,
      { status: QuoteStatus.PENDING, notes: `[Trả lại] ${reason}` },
      { new: true }
    ).lean()
    if (!quote) throw new NotFoundException()
    return quote
  }

  async completeQuoting(id: string): Promise<any> {
    return this.updateStatus(id, QuoteStatus.QUOTED)
  }

  async confirm(id: string): Promise<any> {
    return this.updateStatus(id, QuoteStatus.CONFIRMED)
  }

  async cancel(id: string): Promise<any> {
    return this.updateStatus(id, QuoteStatus.CANCELLED)
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
