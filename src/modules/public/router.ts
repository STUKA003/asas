import { Router } from 'express'
import { publicAvailabilityLimiter, publicLookupLimiter, publicWriteLimiter } from '../../middlewares/rateLimiter'
import {
  cancelManagedBooking,
  confirmManagedBooking,
  getBarbershop,
  getServices,
  getBarbers,
  getExtras,
  getProducts,
  getPlans,
  getManagedBooking,
  getManagedBookingAvailability,
  lookupCustomerPlan,
  lookupCustomerBookings,
  rescheduleManagedBooking,
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
router.post('/customer-bookings', publicLookupLimiter, lookupCustomerBookings)
router.post('/subscribe-plan', publicWriteLimiter, subscribePlan)
router.get('/availability', publicAvailabilityLimiter, getAvailability)
router.post('/bookings',    publicWriteLimiter, createPublicBooking)
router.get('/bookings/manage', publicLookupLimiter, getManagedBooking)
router.get('/bookings/manage/availability', publicAvailabilityLimiter, getManagedBookingAvailability)
router.patch('/bookings/manage/confirm', publicWriteLimiter, confirmManagedBooking)
router.patch('/bookings/manage/cancel', publicWriteLimiter, cancelManagedBooking)
router.patch('/bookings/manage/reschedule', publicWriteLimiter, rescheduleManagedBooking)

export default router
