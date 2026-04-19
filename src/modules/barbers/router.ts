import { Router } from 'express'
import { list, get, create, update, remove, setPassword } from './controller'

const router = Router()

router.get('/', list)
router.get('/:id', get)
router.post('/', create)
router.put('/:id', update)
router.patch('/:id/password', setPassword)
router.delete('/:id', remove)

export default router
