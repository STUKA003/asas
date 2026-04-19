import { Router } from 'express'
import { login, me } from './controller'
import { authenticateBarber } from '../../middlewares/barberAuth'
import { loginLimiter } from '../../middlewares/rateLimiter'

const router = Router()

router.post('/login', loginLimiter, login)
router.get('/me', authenticateBarber, me)

export default router
