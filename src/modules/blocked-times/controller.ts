import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'

const schema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().optional(),
  barberId: z.string().optional(),
})

export async function list(req: Request, res: Response) {
  const { barberId, from, to } = req.query
  const where: Record<string, unknown> = {
    barbershopId: req.auth.barbershopId,
  }

  if (barberId) where.barberId = barberId as string
  if (from || to) {
    where.startTime = { ...(to ? { lt: new Date(to as string) } : {}) }
    where.endTime = { ...(from ? { gt: new Date(from as string) } : {}) }
  }

  const items = await prisma.blockedTime.findMany({
    where,
    include: { barber: { select: { id: true, name: true } } },
    orderBy: { startTime: 'asc' },
  })
  res.json(items)
}

export async function get(req: Request, res: Response) {
  const item = await prisma.blockedTime.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { startTime, endTime, ...rest } = parsed.data

  if (new Date(startTime) >= new Date(endTime)) {
    res.status(400).json({ error: 'startTime must be before endTime' })
    return
  }

  if (rest.barberId) {
    const barber = await prisma.barber.findFirst({
      where: { id: rest.barberId, barbershopId: req.auth.barbershopId },
    })
    if (!barber) { res.status(404).json({ error: 'Barber not found' }); return }
  }

  const item = await prisma.blockedTime.create({
    data: {
      ...rest,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      barbershopId: req.auth.barbershopId,
    },
  })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const parsed = schema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.blockedTime.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  const { startTime, endTime, ...rest } = parsed.data
  const item = await prisma.blockedTime.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
    },
  })
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const exists = await prisma.blockedTime.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  await prisma.blockedTime.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
