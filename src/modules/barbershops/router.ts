import { Router } from 'express'
import {
  createBillingPortalSession,
  createSubscriptionCheckoutSession,
  getMyBarbershop,
  updateBarbershop,
} from './controller'

const router = Router()

router.get('/', getMyBarbershop)
router.put('/', updateBarbershop)
router.post('/subscription/checkout-session', createSubscriptionCheckoutSession)
router.post('/subscription/portal-session', createBillingPortalSession)

export default router
