import { Router } from 'express'
import quotesRoutes from './quotes.routes'
import pricingConfigRoutes from './pricingConfig.routes'
import notificationsRoutes from './notifications.routes'

const router = Router()

router.use('/quotes', quotesRoutes)
router.use('/pricing-config', pricingConfigRoutes)
router.use('/notifications', notificationsRoutes)

export default router
