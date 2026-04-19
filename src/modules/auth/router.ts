import { Router } from 'express'
import { login, me, register } from './controller'
import { authenticate } from '../../middlewares/auth'
import { loginLimiter } from '../../middlewares/rateLimiter'

const router = Router()

router.post('/register', register)
router.post('/login', loginLimiter, login)
router.get('/me', authenticate, me)

export default router
