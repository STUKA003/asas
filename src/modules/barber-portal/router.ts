import { Router } from 'express'
import { addBookingItems, getAvailableExtras, getAvailableProducts, getMyBookings, getMyStats, removeBookingItem, rescheduleBooking, updateBookingStatus } from './controller'
import { authenticateBarber } from '../../middlewares/barberAuth'

const router = Router()

router.use(authenticateBarber)

router.get('/bookings',                  getMyBookings)
router.get('/stats',                     getMyStats)
router.get('/extras',                    getAvailableExtras)
router.get('/products',                  getAvailableProducts)
router.patch('/bookings/:id/status',     updateBookingStatus)
router.patch('/bookings/:id/reschedule', rescheduleBooking)
router.patch('/bookings/:id/items',      addBookingItems)
router.patch('/bookings/:id/items/remove', removeBookingItem)

export default router
