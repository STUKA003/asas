import { Router } from 'express'
import { login, stats, listBarbershops, getBarbershop, updateBarbershopDetails, updateBarbershopSubscription, suspendBarbershop, createBarbershop, deleteBarbershop, createSupportSession, resendOwnerVerification, verifyOwnerEmail, updateOwnerPassword } from './controller'
import { authenticateSuperAdmin } from '../../middlewares/superadmin'
import { loginLimiter } from '../../middlewares/rateLimiter'

const router = Router()

router.post('/auth/login', loginLimiter, login)
router.get('/stats',                          authenticateSuperAdmin, stats)
router.get('/barbershops',                    authenticateSuperAdmin, listBarbershops)
router.post('/barbershops',                   authenticateSuperAdmin, createBarbershop)
router.get('/barbershops/:id',                authenticateSuperAdmin, getBarbershop)
router.patch('/barbershops/:id',              authenticateSuperAdmin, updateBarbershopDetails)
router.post('/barbershops/:id/support-session', authenticateSuperAdmin, createSupportSession)
router.post('/barbershops/:id/resend-verification', authenticateSuperAdmin, resendOwnerVerification)
router.patch('/barbershops/:id/verify-email', authenticateSuperAdmin, verifyOwnerEmail)
router.patch('/barbershops/:id/password',     authenticateSuperAdmin, updateOwnerPassword)
router.patch('/barbershops/:id/subscription', authenticateSuperAdmin, updateBarbershopSubscription)
router.patch('/barbershops/:id/suspend',      authenticateSuperAdmin, suspendBarbershop)
router.delete('/barbershops/:id',             authenticateSuperAdmin, deleteBarbershop)

export default router
