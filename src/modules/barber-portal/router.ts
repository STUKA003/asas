import { Router } from 'express'
import {
  addBookingItems,
  getAvailableExtras,
  getAvailableProducts,
  getMyBookings,
  getMyStats,
  listNotifications,
  markAllNotificationsRead,
  removeBookingItem,
  rescheduleBooking,
  unreadNotificationsCount,
  updateBookingStatus,
} from './controller'
import {
  getBarberPushConfig as getBarberPushConfigShared,
  saveBarberPushSubscription as saveBarberPushSubscriptionShared,
  deleteBarberPushSubscription as deleteBarberPushSubscriptionShared,
} from '../push/controller'
import { authenticateBarber } from '../../middlewares/barberAuth'

const router = Router()

router.use(authenticateBarber)

router.get('/bookings',                  getMyBookings)
router.get('/stats',                     getMyStats)
router.get('/extras',                    getAvailableExtras)
router.get('/products',                  getAvailableProducts)
router.get('/push/config',              getBarberPushConfigShared)
router.post('/push/subscriptions',      saveBarberPushSubscriptionShared)
router.delete('/push/subscriptions',    deleteBarberPushSubscriptionShared)
router.get('/notifications',             listNotifications)
router.get('/notifications/unread',      unreadNotificationsCount)
router.patch('/notifications/read-all',  markAllNotificationsRead)
router.patch('/bookings/:id/status',     updateBookingStatus)
router.patch('/bookings/:id/reschedule', rescheduleBooking)
router.patch('/bookings/:id/items',      addBookingItems)
router.patch('/bookings/:id/items/remove', removeBookingItem)

export default router
