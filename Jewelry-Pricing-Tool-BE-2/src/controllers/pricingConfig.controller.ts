import { Request, Response, NextFunction } from 'express'
import { pricingConfigService } from '../services/pricingConfig.service'
import { authService } from '../services/auth.service'

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
      const user = await authService.getCurrentUser(req)
      if (!user || user.role !== 'order') {
        res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' })
        return
      }
      const config = await pricingConfigService.update(req.body, user.id)
      res.json(config)
    } catch (error) {
      next(error)
    }
  }
}

export const pricingConfigController = new PricingConfigController()
