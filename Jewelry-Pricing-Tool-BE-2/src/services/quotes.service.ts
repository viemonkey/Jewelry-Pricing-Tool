import { Quote, QuoteStatus } from '../models/Quote'
import { PricingConfig } from '../models/PricingConfig'
import { notificationsService } from './notifications.service'

function getProfitDivisor(
  costWithVAT: number,
  profitMargins: Array<{ maxCost: number; divisor: number; margin: string }>
): { divisor: number; margin: string } {
  for (const tier of profitMargins) {
    if (costWithVAT < tier.maxCost) {
      return { divisor: tier.divisor, margin: tier.margin }
    }
  }
  const last = profitMargins[profitMargins.length - 1]
  return { divisor: last?.divisor ?? 0.75, margin: last?.margin ?? '25%' }
}

async function calculateQuoteOption(option: any, config: any, isMulti: boolean, sharedLaborCost: number, sharedStoneCost: number) {
  const isSilver = option.materialType === 'SILVER'
  const isPlatinum = option.materialType === 'PLATINUM'
  
  // 1. Calculate materialCost
  let materialCost = 0
  if (isSilver) {
    materialCost = parseFloat(option.materialCost) || 0
  } else if (isPlatinum) {
    const platinumPrice = parseFloat(option.platinumPrice) || config.platinumPrice || 0
    const weight = parseFloat(option.weightChi || option.weightGram || '0') || 0
    materialCost = parseFloat(option.materialCost) || Math.round(platinumPrice * weight)
  } else {
    // Gold
    const goldPrice24K = parseFloat(option.goldPrice24K) || config.goldPrice24K || 9000000
    const ratioObj = config.goldRatios.find((r: any) => r.key === option.materialType)
    const ratio = ratioObj ? ratioObj.applied : 0
    const weight = parseFloat(option.weightChi || option.weightGram || '0') || 0
    materialCost = Math.round(ratio * goldPrice24K * weight)
  }

  // 2. Calculate stoneCost
  const stoneCostVal = isMulti
    ? (parseFloat(option.stoneCost) || 0)
    : (isSilver ? 0 : sharedStoneCost)

  // 3. Calculate laborCost
  const laborCostVal = isSilver || isPlatinum ? 0 : sharedLaborCost

  // 4. Calculate costBeforeVAT
  const costBeforeVAT = isSilver
    ? materialCost + stoneCostVal
    : isPlatinum
      ? materialCost + stoneCostVal
      : (materialCost + stoneCostVal + laborCostVal)

  // 5. Calculate costWithVAT
  const costWithVAT = isSilver || isPlatinum ? costBeforeVAT : Math.round(costBeforeVAT * 1.1)

  // 6. Calculate sellingPrice
  let sellingPrice = 0
  if (isSilver) {
    sellingPrice = materialCost * (config.silverMultiplier ?? 3) + stoneCostVal
  } else if (isPlatinum) {
    sellingPrice = costWithVAT
  } else if (config.profitMargins) {
    const { divisor } = getProfitDivisor(costWithVAT, config.profitMargins)
    sellingPrice = costBeforeVAT > 0 ? Math.round(costWithVAT / divisor / 1000) * 1000 : 0
  }

  return {
    materialType: option.materialType,
    weightChi: option.weightChi,
    weightGram: option.weightGram,
    laborCost: laborCostVal,
    goldPrice24K: isPlatinum ? undefined : (option.goldPrice24K || config.goldPrice24K),
    platinumPrice: option.platinumPrice,
    materialCost,
    stoneCost: stoneCostVal,
    costBeforeVAT,
    costWithVAT,
    costPrice: costWithVAT,
    sellingPrice,
  }
}

export class QuotesService {
  async findAll(status?: QuoteStatus, isQuickQuote?: boolean) {
    const filter: any = {}
    if (status) filter.status = status
    if (isQuickQuote !== undefined) {
      filter.isQuickQuote = isQuickQuote
    } else {
      filter.isQuickQuote = { $ne: true }
    }
    const quotes = await Quote.find(filter).sort({ createdAt: -1 })
    
    let changed = false
    for (const quote of quotes) {
      if (quote.status === QuoteStatus.SENT_TO_CUSTOMER && quote.options && quote.options.length > 0) {
        const allCancelled = quote.options.every(o => o.isCancelled)
        const allResolved = quote.options.every(o => o.isConfirmed || o.isCancelled)
        const hasConfirmed = quote.options.some(o => o.isConfirmed)
        
        if (allCancelled) {
          quote.status = QuoteStatus.CANCELLED
          await quote.save()
          changed = true
        } else if (allResolved && hasConfirmed) {
          quote.status = QuoteStatus.CONFIRMED
          await quote.save()
          changed = true
        }
      }
    }
    
    if (changed && status) {
      return Quote.find(filter).sort({ createdAt: -1 }).lean()
    }
    
    return quotes.map(q => q.toObject())
  }

  async findOne(id: string) {
    const quote = await Quote.findById(id)
    if (!quote) {
      const err = new Error(`Quote ${id} không tồn tại`)
      ;(err as any).statusCode = 404
      throw err
    }
    
    if (quote.status === QuoteStatus.SENT_TO_CUSTOMER && quote.options && quote.options.length > 0) {
      const allCancelled = quote.options.every(o => o.isCancelled)
      const allResolved = quote.options.every(o => o.isConfirmed || o.isCancelled)
      const hasConfirmed = quote.options.some(o => o.isConfirmed)
      
      if (allCancelled) {
        quote.status = QuoteStatus.CANCELLED
        await quote.save()
      } else if (allResolved && hasConfirmed) {
        quote.status = QuoteStatus.CONFIRMED
        await quote.save()
      }
    }
    
    return quote.toObject()
  }

  async create(dto: any, imageUrls: string[]) {
    const year = new Date().getFullYear()
    const count = await Quote.countDocuments()
    const isQuick = dto.isQuickQuote === 'true' || dto.isQuickQuote === true
    const prefix = isQuick ? 'QQ' : 'QT'
    const quoteCode = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`

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
      isQuickQuote: isQuick,
      status: QuoteStatus.PENDING,
    })
    return quote.save()
  }

  async updatePrice(id: string, dto: any) {
    const config = await PricingConfig.findOne()
    if (!config) {
      const err = new Error('Pricing configuration not found')
      ;(err as any).statusCode = 500
      throw err
    }

    const updateData = { ...dto }

    if (dto.options && Array.isArray(dto.options) && dto.options.length > 0) {
      const isMulti = dto.options.length > 1
      const sharedLaborCost = parseFloat(dto.laborCost) || 0
      const sharedStoneCost = parseFloat(dto.stoneCost) || 0
      
      const calculatedOptions = []
      for (const opt of dto.options) {
        const calculatedOpt = await calculateQuoteOption(
          opt,
          config,
          isMulti,
          sharedLaborCost,
          sharedStoneCost
        )
        calculatedOptions.push({
          ...opt,
          ...calculatedOpt
        })
      }
      updateData.options = calculatedOptions

      // Backwards compatibility: populate top-level fields from the first option
      const firstOpt = calculatedOptions[0]
      updateData.materialType = firstOpt.materialType
      updateData.weightChi = firstOpt.weightChi
      updateData.weightGram = firstOpt.weightGram
      updateData.laborCost = firstOpt.laborCost
      updateData.goldPrice24K = firstOpt.goldPrice24K
      updateData.platinumPrice = firstOpt.platinumPrice
      updateData.materialCost = firstOpt.materialCost
      updateData.stoneCost = firstOpt.stoneCost
      updateData.costBeforeVAT = firstOpt.costBeforeVAT
      updateData.costWithVAT = firstOpt.costWithVAT
      updateData.costPrice = firstOpt.costPrice
      updateData.sellingPrice = firstOpt.sellingPrice
    } else {
      // Single-option fallback
      const singleOpt = {
        materialType: dto.materialType,
        weightChi: dto.weightChi,
        weightGram: dto.weightGram,
        laborCost: parseFloat(dto.laborCost) || 0,
        goldPrice24K: parseFloat(dto.goldPrice24K),
        platinumPrice: parseFloat(dto.platinumPrice),
        materialCost: parseFloat(dto.materialCost),
        stoneCost: parseFloat(dto.stoneCost) || 0,
      }
      const calculatedOpt = await calculateQuoteOption(
        singleOpt,
        config,
        false,
        singleOpt.laborCost,
        singleOpt.stoneCost
      )
      
      updateData.materialCost = calculatedOpt.materialCost
      updateData.stoneCost = calculatedOpt.stoneCost
      updateData.costBeforeVAT = calculatedOpt.costBeforeVAT
      updateData.costWithVAT = calculatedOpt.costWithVAT
      updateData.costPrice = calculatedOpt.costPrice
      updateData.sellingPrice = calculatedOpt.sellingPrice
      updateData.options = [{
        ...singleOpt,
        ...calculatedOpt
      }]
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
    const updateData = { ...data }
    if (updateData.options) {
      try {
        updateData.options = typeof updateData.options === 'string' ? JSON.parse(updateData.options) : updateData.options
      } catch (err) {}
    }
    const quote = await Quote.findByIdAndUpdate(id, updateData, { new: true }).lean()
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

  async confirm(id: string, selectedOption?: any, selectedOptions?: any[]) {
    const quote = await Quote.findById(id)
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }

    if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length > 0) {
      const targetTypes = selectedOptions.map(o => o.materialType)
      
      if (quote.options && quote.options.length > 0) {
        quote.options.forEach(o => {
          if (targetTypes.includes(o.materialType)) {
            o.isConfirmed = true
            o.isCancelled = false
          } else {
            o.isConfirmed = false
            o.isCancelled = true
          }
        })
        ;(quote as any).markModified('options')

        const confirmedOptionsTotal = quote.options
          .filter(o => o.isConfirmed)
          .reduce((sum, o) => sum + (Number(o.sellingPrice) || 0), 0)
        quote.confirmedPrice = confirmedOptionsTotal || quote.sellingPrice || 0
      } else {
        quote.confirmedPrice = quote.sellingPrice || 0
      }
      
      // Update top-level fields from the first selected option for compatibility
      const primaryOption = selectedOptions[0]
      quote.materialType = primaryOption.materialType
      quote.weightChi = primaryOption.weightChi
      quote.weightGram = primaryOption.weightGram
      quote.laborCost = primaryOption.laborCost
      quote.goldPrice24K = primaryOption.goldPrice24K
      quote.platinumPrice = primaryOption.platinumPrice
      quote.materialCost = primaryOption.materialCost
      quote.stoneCost = primaryOption.stoneCost
      quote.costBeforeVAT = primaryOption.costBeforeVAT
      quote.costWithVAT = primaryOption.costWithVAT
      quote.costPrice = primaryOption.costPrice
      quote.sellingPrice = primaryOption.sellingPrice

      quote.status = QuoteStatus.CONFIRMED
    } else if (selectedOption) {
      quote.materialType = selectedOption.materialType
      quote.weightChi = selectedOption.weightChi
      quote.weightGram = selectedOption.weightGram
      quote.laborCost = selectedOption.laborCost
      quote.goldPrice24K = selectedOption.goldPrice24K
      quote.platinumPrice = selectedOption.platinumPrice
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
          option.isCancelled = false
        }
        ;(quote as any).markModified('options')

        const confirmedOptionsTotal = quote.options
          .filter(o => o.isConfirmed)
          .reduce((sum, o) => sum + (Number(o.sellingPrice) || 0), 0)
        quote.confirmedPrice = confirmedOptionsTotal || selectedOption.sellingPrice || quote.sellingPrice || 0

        const allResolved = quote.options.every(o => o.isConfirmed || o.isCancelled)
        const hasConfirmed = quote.options.some(o => o.isConfirmed)
        if (allResolved && hasConfirmed) {
          quote.status = QuoteStatus.CONFIRMED
        } else {
          quote.status = QuoteStatus.SENT_TO_CUSTOMER
        }
      } else {
        quote.confirmedPrice = selectedOption.sellingPrice || quote.sellingPrice || 0
        quote.status = QuoteStatus.CONFIRMED
      }
    } else {
      quote.confirmedPrice = quote.sellingPrice || 0
      quote.status = QuoteStatus.CONFIRMED
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
        option.isConfirmed = false
      }
      ;(quote as any).markModified('options')
      const allCancelled = quote.options.every(o => o.isCancelled)
      const allResolved = quote.options.every(o => o.isConfirmed || o.isCancelled)
      const hasConfirmed = quote.options.some(o => o.isConfirmed)
      
      if (allCancelled) {
        quote.status = QuoteStatus.CANCELLED
      } else if (allResolved && hasConfirmed) {
        quote.status = QuoteStatus.CONFIRMED
      } else {
        quote.status = QuoteStatus.SENT_TO_CUSTOMER
      }
    } else {
      quote.status = QuoteStatus.CANCELLED
      if (quote.options && quote.options.length > 0) {
        quote.options.forEach(o => {
          o.isCancelled = true
          o.isConfirmed = false
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
    } else if (result.status === QuoteStatus.CONFIRMED) {
      notificationsService.notifyQuoteConfirmed(
        result.quoteCode || '',
        result.productName,
        String(result._id)
      )
    }
    return result
  }

  private async updateStatus(id: string, status: QuoteStatus) {
    const updateData: any = { status }
    if (status === QuoteStatus.QUOTED) {
      updateData.quotedAt = new Date()
    }
    const quote = await Quote.findByIdAndUpdate(id, updateData, { new: true }).lean()
    if (!quote) {
      const err = new Error('Quote not found')
      ;(err as any).statusCode = 404
      throw err
    }
    return quote
  }

  async getStats() {
    const [total, pending, quoted, pricedTotal, confirmed, confirmedQuotes] = await Promise.all([
      Quote.countDocuments(),
      Quote.countDocuments({ status: QuoteStatus.PENDING }),
      Quote.countDocuments({ status: QuoteStatus.QUOTED }),
      Quote.countDocuments({
        $or: [
          { quotedBy: { $exists: true, $ne: '' } },
          { sellingPrice: { $gt: 0 } },
          { options: { $elemMatch: { sellingPrice: { $gt: 0 } } } },
        ],
      }),
      Quote.countDocuments({ status: QuoteStatus.CONFIRMED }),
      Quote.find({ status: QuoteStatus.CONFIRMED }).lean(),
    ])
    const confirmedRevenue = confirmedQuotes.reduce((sum: number, quote: any) => {
      const quantity = Number(quote.quantity) || 1
      const confirmedOptionsTotal = Array.isArray(quote.options)
        ? quote.options
            .filter((option: any) => option?.isConfirmed)
            .reduce((optionSum: number, option: any) => optionSum + (Number(option?.sellingPrice) || 0), 0)
        : 0
      const quoteRevenue = confirmedOptionsTotal || Number(quote.confirmedPrice) || Number(quote.sellingPrice) || 0
      return sum + quoteRevenue * quantity
    }, 0)
    return { total, pending, quoted, pricedTotal, confirmed, confirmedRevenue }
  }
}

export const quotesService = new QuotesService()
