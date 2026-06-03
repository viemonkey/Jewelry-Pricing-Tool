import { Router } from 'express'
import { productionController } from '../controllers/production.controller'
import { uploadProduction } from '../middleware/upload.middleware'

const router = Router()

router.get('/', productionController.findAll)
router.get('/:id', productionController.findOne)
router.post('/', productionController.create)
router.patch('/:id/progress', productionController.updateProgress)
router.patch('/:id/complete', uploadProduction, productionController.complete)

export default router
