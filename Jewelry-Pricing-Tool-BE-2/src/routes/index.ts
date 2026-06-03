import { Router } from 'express'
import quotesRoutes from './quotes.routes'
import productionRoutes from './production.routes'
import pricingConfigRoutes from './pricingConfig.routes'
import notificationsRoutes from './notifications.routes'

const router = Router()

router.use('/quotes', quotesRoutes)
router.use('/production', productionRoutes)
router.use('/pricing-config', pricingConfigRoutes)
router.use('/notifications', notificationsRoutes)

export default router
