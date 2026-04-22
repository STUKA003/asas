import { Router } from 'express'
import { authenticate } from '../../middlewares/auth'
import {
  deleteAdminPushSubscription,
  getAdminPushConfig,
  saveAdminPushSubscription,
} from './controller'

const router = Router()

router.use(authenticate)
router.get('/config', getAdminPushConfig)
router.post('/subscriptions', saveAdminPushSubscription)
router.delete('/subscriptions', deleteAdminPushSubscription)

export default router
