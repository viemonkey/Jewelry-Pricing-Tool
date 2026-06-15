import mongoose from 'mongoose'
import { PricingConfig } from '../models/PricingConfig'
import { Quote } from '../models/Quote'
import { GoldPrice } from '../models/GoldPrice'

export class PricingConfigService {
  async get() {
    return PricingConfig.findOne().lean()
  }

  async update(data: any, userId?: string) {
    const config = await PricingConfig.findOneAndUpdate({}, data, { new: true, upsert: true }).lean()

    // If goldPrice24K is updated, recalculate all quotes in the database
    if (data.goldPrice24K !== undefined) {
      const newGoldPrice = Number(data.goldPrice24K)
      await this.recalculateQuotes(newGoldPrice, config)

      // Record to GoldPrice history
      await GoldPrice.create({
        pricePerChi: newGoldPrice,
        pricePerGram: Math.round(newGoldPrice / 3.75),
        effectiveDate: new Date(),
        source: 'manual',
        updatedBy: userId ? new mongoose.Types.ObjectId(userId) : null,
      })
    }

    return config
  }

  private async recalculateQuotes(newGoldPrice: number, config: any) {
    // Chỉ tính toán lại các báo giá đang xử lý (chờ báo giá, cần bổ sung, đang báo giá)
    // Các đơn đã báo giá (QUOTED, SENT_TO_CUSTOMER) sẽ được khóa giá tương tự đơn CONFIRMED/CANCELLED
    const quotes = await Quote.find({
      status: { $in: ['PENDING', 'NEED_MORE_INFO', 'QUOTING'] }
    })

    // Load gold ratios and profit margins
    const ratiosMap: Record<string, number> = {}
    if (config.goldRatios) {
      for (const ratio of config.goldRatios) {
        ratiosMap[ratio.key] = ratio.applied
      }
    }
    const profitMargins = config.profitMargins || []
    const getRatio = (materialType: string) => {
      const legacyKey = materialType.replace('GOLD_', '').replace('GOLD', '24K')
      return ratiosMap[materialType] ?? ratiosMap[legacyKey] ?? 0
    }
    const getWeightChi = (item: any) => {
      if (item.weightChi !== undefined && item.weightChi !== null) return item.weightChi || 0
      if (item.weightGram !== undefined && item.weightGram !== null) return (item.weightGram || 0) / 3.75
      return 0
    }

    for (const quote of quotes) {
      let isModified = false

      // 1. Recalculate options array if it exists
      if (quote.options && quote.options.length > 0) {
        quote.options = quote.options.map((opt: any) => {
          if (opt.materialType && opt.materialType.startsWith('GOLD_')) {
            const ratio = getRatio(opt.materialType)
            const weightChi = getWeightChi(opt)
            const laborCost = opt.laborCost || 0
            const stoneCost = opt.stoneCost || 0

            const goldCost = ratio * newGoldPrice * weightChi
            const costBeforeVAT = goldCost + laborCost + stoneCost
            const costWithVAT = costBeforeVAT * 1.1

            // Find profit margin divisor
            let divisor = 0.75
            for (const tier of profitMargins) {
              if (costWithVAT < tier.maxCost) {
                divisor = tier.divisor
                break
              }
            }
            if (profitMargins.length > 0 && costWithVAT >= profitMargins[profitMargins.length - 1].maxCost) {
              divisor = profitMargins[profitMargins.length - 1].divisor
            }

            const sellingPrice = costBeforeVAT > 0 ? Math.round(costWithVAT / divisor / 1000) * 1000 : 0

            opt.goldPrice24K = newGoldPrice
            opt.materialCost = goldCost
            opt.costBeforeVAT = costBeforeVAT
            opt.costWithVAT = costWithVAT
            opt.costPrice = costWithVAT
            opt.sellingPrice = sellingPrice
            isModified = true
          }
          return opt
        })

        // 2. Populate top-level fields from the first option
        const firstOpt = quote.options[0]
        if (firstOpt && firstOpt.materialType !== 'SILVER') {
          quote.materialType = firstOpt.materialType
          quote.weightChi = firstOpt.weightChi
          quote.weightGram = firstOpt.weightGram
          quote.laborCost = firstOpt.laborCost
          quote.goldPrice24K = firstOpt.goldPrice24K
          quote.platinumPrice = firstOpt.platinumPrice
          quote.materialCost = firstOpt.materialCost
          quote.stoneCost = firstOpt.stoneCost
          quote.costBeforeVAT = firstOpt.costBeforeVAT
          quote.costWithVAT = firstOpt.costWithVAT
          quote.costPrice = firstOpt.costPrice
          quote.sellingPrice = firstOpt.sellingPrice
          isModified = true
        }
      } else {
        // Fallback: If quote has no options but is a gold product, recalculate top-level directly
        if (quote.materialType && quote.materialType.startsWith('GOLD_')) {
          const ratio = getRatio(quote.materialType)
          const weightChi = getWeightChi(quote)
          const laborCost = quote.laborCost || 0
          const stoneCost = quote.stoneCost || 0

          const goldCost = ratio * newGoldPrice * weightChi
          const costBeforeVAT = goldCost + laborCost + stoneCost
          const costWithVAT = costBeforeVAT * 1.1

          let divisor = 0.75
          for (const tier of profitMargins) {
            if (costWithVAT < tier.maxCost) {
              divisor = tier.divisor
              break
            }
          }
          if (profitMargins.length > 0 && costWithVAT >= profitMargins[profitMargins.length - 1].maxCost) {
            divisor = profitMargins[profitMargins.length - 1].divisor
          }

          const sellingPrice = costBeforeVAT > 0 ? Math.round(costWithVAT / divisor / 1000) * 1000 : 0

          quote.goldPrice24K = newGoldPrice
          quote.materialCost = goldCost
          quote.costBeforeVAT = costBeforeVAT
          quote.costWithVAT = costWithVAT
          quote.costPrice = costWithVAT
          quote.sellingPrice = sellingPrice
          isModified = true
        }
      }

      if (isModified) {
        quote.markModified('options')
        await quote.save()
      }
    }
  }
}

export const pricingConfigService = new PricingConfigService()
