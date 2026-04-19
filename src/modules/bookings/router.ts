import { Router } from 'express'
import { list, get, create, updateStatus, reschedule, addItems, removeItem, remove, availability } from './controller'
import { reports } from './reports'

const router = Router()

router.get('/reports', reports)
router.get('/availability', availability)
router.get('/', list)
router.get('/:id', get)
router.post('/', create)
router.patch('/:id/status', updateStatus)
router.patch('/:id/reschedule', reschedule)
router.patch('/:id/items', addItems)
router.patch('/:id/items/remove', removeItem)
router.delete('/:id', remove)

export default router
