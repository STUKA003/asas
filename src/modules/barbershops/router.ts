import { Router } from 'express'
import { getMyBarbershop, updateBarbershop, updateSubscription } from './controller'

const router = Router()

router.get('/', getMyBarbershop)
router.put('/', updateBarbershop)
router.patch('/subscription', updateSubscription)

export default router
