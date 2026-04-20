import { Router } from 'express'
import {
  forgotPassword,
  login,
  me,
  register,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from './controller'
import { authenticate } from '../../middlewares/auth'
import { authEmailLimiter, loginLimiter } from '../../middlewares/rateLimiter'

const router = Router()

router.post('/register', register)
router.post('/login', loginLimiter, login)
router.post('/verify-email', authEmailLimiter, verifyEmail)
router.post('/verify-email/resend', authEmailLimiter, resendVerificationEmail)
router.post('/forgot-password', authEmailLimiter, forgotPassword)
router.post('/reset-password', authEmailLimiter, resetPassword)
router.get('/me', authenticate, me)

export default router
