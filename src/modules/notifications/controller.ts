import { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'

export async function list(req: Request, res: Response) {
  const notifications = await prisma.notification.findMany({
    where:   { barbershopId: req.auth.barbershopId },
    orderBy: { createdAt: 'desc' },
    take:    60,
    include: { barber: { select: { name: true, avatar: true } } },
  })
  res.json(notifications)
}

export async function unreadCount(req: Request, res: Response) {
  const count = await prisma.notification.count({
    where: { barbershopId: req.auth.barbershopId, read: false },
  })
  res.json({ count })
}

export async function markAllRead(req: Request, res: Response) {
  await prisma.notification.updateMany({
    where: { barbershopId: req.auth.barbershopId, read: false },
    data:  { read: true },
  })
  res.json({ ok: true })
}
