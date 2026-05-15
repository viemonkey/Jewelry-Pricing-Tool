import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Quote, QuoteDocument, QuoteStatus } from './quote.schema'
import { CreateQuoteDto } from './dto/create-quote.dto'
import { UpdateQuotePriceDto } from './dto/update-quote-price.dto'

@Injectable()
export class QuotesService {
  constructor(@InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>) {}

  async findAll(status?: QuoteStatus): Promise<Quote[]> {
    const filter = status ? { status } : {}
    return this.quoteModel.find(filter).sort({ createdAt: -1 }).lean() as unknown as Quote[]
  }

  async findOne(id: string): Promise<Quote> {
    const quote = await this.quoteModel.findById(id).lean()
    if (!quote) throw new NotFoundException(`Quote ${id} không tồn tại`)
    return quote as unknown as Quote
  }

  async create(dto: CreateQuoteDto, imageUrls: string[]): Promise<Quote> {
    const quote = new this.quoteModel({ ...dto, images: imageUrls, status: QuoteStatus.PENDING })
    return (await quote.save()) as unknown as Quote
  }

  async updatePrice(id: string, dto: UpdateQuotePriceDto): Promise<Quote> {
    const quote = await this.quoteModel
      .findByIdAndUpdate(id, { ...dto, status: QuoteStatus.QUOTING }, { new: true })
      .lean()
    if (!quote) throw new NotFoundException()
    return quote as unknown as Quote
  }

  async completeQuoting(id: string): Promise<Quote> {
    return this.updateStatus(id, QuoteStatus.QUOTED)
  }

  async confirm(id: string): Promise<Quote> {
    return this.updateStatus(id, QuoteStatus.CONFIRMED)
  }

  async cancel(id: string): Promise<Quote> {
    return this.updateStatus(id, QuoteStatus.CANCELLED)
  }

  async markInProduction(id: string): Promise<Quote> {
    return this.updateStatus(id, QuoteStatus.IN_PRODUCTION)
  }

  private async updateStatus(id: string, status: QuoteStatus): Promise<Quote> {
    const quote = await this.quoteModel.findByIdAndUpdate(id, { status }, { new: true }).lean()
    if (!quote) throw new NotFoundException()
    return quote as unknown as Quote
  }
}
