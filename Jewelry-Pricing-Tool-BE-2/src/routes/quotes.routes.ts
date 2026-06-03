import { Router } from 'express'
import { quotesController } from '../controllers/quotes.controller'
import { uploadQuotes } from '../middleware/upload.middleware'

const router = Router()

router.get('/', quotesController.findAll)
router.get('/stats', quotesController.getStats)
router.get('/:id', quotesController.findOne)

// POST with multer
router.post('/', uploadQuotes, quotesController.create)

router.patch('/:id/price', quotesController.updatePrice)
router.patch('/:id/start-quoting', quotesController.startQuoting)
router.patch('/:id/reject', quotesController.rejectQuote)

// PATCH info with multer
router.patch('/:id/info', uploadQuotes, quotesController.updateInfo)

router.patch('/:id/resubmit', quotesController.resubmit)
router.patch('/:id/complete-quoting', quotesController.completeQuoting)
router.patch('/:id/sent-to-customer', quotesController.sentToCustomer)
router.patch('/:id/confirm', quotesController.confirm)
router.patch('/:id/cancel', quotesController.cancel)

export default router
