import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { PricingConfig, PricingConfigDocument } from './pricing-config.schema'

// Giá trị mặc định — chỉ dùng khi DB chưa có record nào.
// Sau khi seed lần đầu, mọi thay đổi đều qua API PUT /pricing-config
const DEFAULT_CONFIG = {
  goldRatios: [
    { key: '10K', standard: 0.417, applied: 0.47, label: 'Vàng 10K' },
    { key: '14K', standard: 0.583, applied: 0.64, label: 'Vàng 14K' },
    { key: '18K', standard: 0.750, applied: 0.80, label: 'Vàng 18K' },
    { key: '610', standard: 0.610, applied: 0.66, label: 'Vàng 610' },
    { key: '24K', standard: 0.9999, applied: 1.05, label: 'Vàng 24K' },
  ],
  profitMargins: [
    { maxCost: 10_000_000, divisor: 0.65, margin: '35%' },
    { maxCost: 50_000_000, divisor: 0.70, margin: '30%' },
    { maxCost: 999_999_999_999, divisor: 0.75, margin: '25%' },
  ],
  silverMultiplier: 3,
}

@Injectable()
export class PricingConfigService implements OnModuleInit {
  constructor(
    @InjectModel(PricingConfig.name)
    private model: Model<PricingConfigDocument>,
  ) {}

  /** Seed record mặc định nếu DB trống */
  async onModuleInit() {
    const count = await this.model.countDocuments()
    if (count === 0) {
      await this.model.create(DEFAULT_CONFIG)
    }
  }

  async get(): Promise<PricingConfigDocument> {
    return this.model.findOne().lean() as any
  }

  async update(data: Partial<typeof DEFAULT_CONFIG>): Promise<PricingConfigDocument> {
    return this.model.findOneAndUpdate({}, data, { new: true, upsert: true }).lean() as any
  }
}
