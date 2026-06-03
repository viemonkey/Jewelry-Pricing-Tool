import { Router } from 'express'
import { pricingConfigController } from '../controllers/pricingConfig.controller'

const router = Router()

router.get('/', pricingConfigController.get)
router.put('/', pricingConfigController.update)

export default router
