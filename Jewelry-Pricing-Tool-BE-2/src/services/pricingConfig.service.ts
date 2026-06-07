import { PricingConfig } from '../models/PricingConfig'
import { Quote } from '../models/Quote'

export class PricingConfigService {
  async get() {
    return PricingConfig.findOne().lean()
  }

  async update(data: any) {
    const config = await PricingConfig.findOneAndUpdate({}, data, { new: true, upsert: true }).lean()
    
    // If goldPrice24K is updated, recalculate all quotes in the database
    if (data.goldPrice24K !== undefined) {
      const newGoldPrice = Number(data.goldPrice24K)
      await this.recalculateQuotes(newGoldPrice, config)
    }

    return config
  }

  private async recalculateQuotes(newGoldPrice: number, config: any) {
    // Get all quotes
    const quotes = await Quote.find({})
    
    // Load gold ratios and profit margins
    const ratiosMap: Record<string, number> = {}
    if (config.goldRatios) {
      for (const ratio of config.goldRatios) {
        ratiosMap[ratio.key] = ratio.applied
      }
    }
    const profitMargins = config.profitMargins || []

    for (const quote of quotes) {
      let isModified = false

      // 1. Recalculate options array if it exists
      if (quote.options && quote.options.length > 0) {
        quote.options = quote.options.map((opt: any) => {
          if (opt.materialType && opt.materialType !== 'SILVER') {
            const ratioKey = opt.materialType.replace('GOLD_', '')
            const ratio = ratiosMap[ratioKey] || 0
            const weightChi = opt.weightChi || 0
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
        if (quote.materialType && quote.materialType !== 'SILVER') {
          const ratioKey = quote.materialType.replace('GOLD_', '')
          const ratio = ratiosMap[ratioKey] || 0
          const weightChi = quote.weightChi || 0
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
