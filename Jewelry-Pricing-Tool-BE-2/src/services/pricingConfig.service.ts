import { PricingConfig } from '../models/PricingConfig'

export class PricingConfigService {
  async get() {
    return PricingConfig.findOne().lean()
  }

  async update(data: any) {
    return PricingConfig.findOneAndUpdate({}, data, { new: true, upsert: true }).lean()
  }
}

export const pricingConfigService = new PricingConfigService()
