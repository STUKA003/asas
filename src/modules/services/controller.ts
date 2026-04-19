import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  duration: z.number().int().positive(),
  active: z.boolean().optional(),
})

export async function list(req: Request, res: Response) {
  const items = await prisma.service.findMany({
    where: { barbershopId: req.auth.barbershopId },
    orderBy: { name: 'asc' },
  })
  res.json(items)
}

export async function get(req: Request, res: Response) {
  const item = await prisma.service.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const item = await prisma.service.create({
    data: { ...parsed.data, barbershopId: req.auth.barbershopId },
  })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const parsed = schema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.service.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  const item = await prisma.service.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const exists = await prisma.service.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  await prisma.service.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
