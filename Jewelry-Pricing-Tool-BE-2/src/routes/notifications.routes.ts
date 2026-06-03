import { Router } from 'express'
import { notificationsController } from '../controllers/notifications.controller'

const router = Router()

router.get('/stream', notificationsController.stream)

export default router
