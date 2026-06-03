import { Request, Response, NextFunction } from 'express'
import { pricingConfigService } from '../services/pricingConfig.service'

export class PricingConfigController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await pricingConfigService.get()
      res.json(config)
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await pricingConfigService.update(req.body)
      res.json(config)
    } catch (error) {
      next(error)
    }
  }
}

export const pricingConfigController = new PricingConfigController()
