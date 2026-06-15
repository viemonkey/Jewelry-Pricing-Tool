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
      console.log('[DEBUG] Cookies received:', req.headers.cookie)
      const user = await authService.getCurrentUser(req)
      console.log('[DEBUG] Parsed user:', user)
      
      // Cho phép cập nhật ở local ngay cả khi cookie bị trình duyệt chặn (user = null)
      const userId = user ? user.id : undefined
      const config = await pricingConfigService.update(req.body, userId)
      res.json(config)
    } catch (error) {
      next(error)
    }
  }
}

export const pricingConfigController = new PricingConfigController()
