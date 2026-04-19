import { Router } from 'express'
import { list, get, create, update, remove, importCustomers } from './controller'

const router = Router()
router.get('/', list)
router.post('/import', importCustomers)
router.get('/:id', get)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)
export default router
