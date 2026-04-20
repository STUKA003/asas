import { Router } from 'express'
import { publicAvailabilityLimiter, publicLookupLimiter, publicWriteLimiter } from '../../middlewares/rateLimiter'
import {
  getBarbershop,
  getServices,
  getBarbers,
  getExtras,
  getProducts,
  getPlans,
  lookupCustomerPlan,
  subscribePlan,
  getAvailability,
  createPublicBooking,
} from './controller'

// All routes are public — no auth middleware
const router = Router({ mergeParams: true }) // inherit :slug from parent

router.get('/',             getBarbershop)
router.get('/services',     getServices)
router.get('/barbers',      getBarbers)
router.get('/extras',       getExtras)
router.get('/products',     getProducts)
router.get('/plans',        getPlans)
router.post('/customer-plan', publicLookupLimiter, lookupCustomerPlan)
router.post('/subscribe-plan', publicWriteLimiter, subscribePlan)
router.get('/availability', publicAvailabilityLimiter, getAvailability)
router.post('/bookings',    publicWriteLimiter, createPublicBooking)

export default router
