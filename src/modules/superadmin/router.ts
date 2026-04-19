import { Router } from 'express'
import { login, stats, listBarbershops, getBarbershop, updateBarbershopDetails, updateBarbershopSubscription, suspendBarbershop, createBarbershop, deleteBarbershop, createSupportSession } from './controller'
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
router.patch('/barbershops/:id/subscription', authenticateSuperAdmin, updateBarbershopSubscription)
router.patch('/barbershops/:id/suspend',      authenticateSuperAdmin, suspendBarbershop)
router.delete('/barbershops/:id',             authenticateSuperAdmin, deleteBarbershop)

export default router
