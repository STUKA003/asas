import { Router } from 'express'
import { list, unreadCount, markAllRead } from './controller'
import { authenticate } from '../../middlewares/auth'

const router = Router()
router.use(authenticate)

router.get('/',            list)
router.get('/unread',      unreadCount)
router.patch('/read-all',  markAllRead)

export default router
