import { Router } from 'express'
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
router.get('/customer-plan', lookupCustomerPlan)
router.post('/subscribe-plan', subscribePlan)
router.get('/availability', getAvailability)
router.post('/bookings',    createPublicBooking)

export default router
