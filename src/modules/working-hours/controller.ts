import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'

const schema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean().optional(),
  barberId: z.string().optional(),
})

function isTimeBefore(startTime: string, endTime: string) {
  return startTime.localeCompare(endTime) < 0
}

async function hasOverlappingWorkingHours(input: {
  idToExclude?: string
  barbershopId: string
  barberId?: string
  dayOfWeek: number
  startTime: string
  endTime: string
}) {
  const { idToExclude, barbershopId, barberId, dayOfWeek, startTime, endTime } = input

  const existing = await prisma.workingHours.findMany({
    where: {
      barbershopId,
      dayOfWeek,
      barberId: barberId ?? null,
      ...(idToExclude ? { id: { not: idToExclude } } : {}),
    },
    select: { startTime: true, endTime: true },
  })

  return existing.some((item) => startTime < item.endTime && endTime > item.startTime)
}

export async function list(req: Request, res: Response) {
  const { barberId } = req.query
  const items = await prisma.workingHours.findMany({
    where: {
      barbershopId: req.auth.barbershopId,
      ...(barberId ? { barberId: barberId as string } : {}),
    },
    include: { barber: { select: { id: true, name: true } } },
    orderBy: [{ barberId: 'asc' }, { dayOfWeek: 'asc' }],
  })
  res.json(items)
}

export async function get(req: Request, res: Response) {
  const item = await prisma.workingHours.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  if (!isTimeBefore(parsed.data.startTime, parsed.data.endTime)) {
    res.status(400).json({ error: 'startTime must be earlier than endTime' })
    return
  }

  if (parsed.data.barberId) {
    const barber = await prisma.barber.findFirst({
      where: { id: parsed.data.barberId, barbershopId: req.auth.barbershopId },
    })
    if (!barber) { res.status(404).json({ error: 'Barber not found' }); return }
  }

  const overlaps = await hasOverlappingWorkingHours({
    barbershopId: req.auth.barbershopId,
    barberId: parsed.data.barberId,
    dayOfWeek: parsed.data.dayOfWeek,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
  })
  if (overlaps) {
    res.status(409).json({ error: 'Working hours overlap an existing period' })
    return
  }

  const item = await prisma.workingHours.create({
    data: { ...parsed.data, barbershopId: req.auth.barbershopId },
  })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const parsed = schema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.workingHours.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  const nextBarberId = parsed.data.barberId ?? exists.barberId ?? undefined
  const nextDayOfWeek = parsed.data.dayOfWeek ?? exists.dayOfWeek
  const nextStartTime = parsed.data.startTime ?? exists.startTime
  const nextEndTime = parsed.data.endTime ?? exists.endTime

  if (!isTimeBefore(nextStartTime, nextEndTime)) {
    res.status(400).json({ error: 'startTime must be earlier than endTime' })
    return
  }

  if (parsed.data.barberId) {
    const barber = await prisma.barber.findFirst({
      where: { id: parsed.data.barberId, barbershopId: req.auth.barbershopId },
    })
    if (!barber) { res.status(404).json({ error: 'Barber not found' }); return }
  }

  const overlaps = await hasOverlappingWorkingHours({
    idToExclude: req.params.id,
    barbershopId: req.auth.barbershopId,
    barberId: nextBarberId,
    dayOfWeek: nextDayOfWeek,
    startTime: nextStartTime,
    endTime: nextEndTime,
  })
  if (overlaps) {
    res.status(409).json({ error: 'Working hours overlap an existing period' })
    return
  }

  const item = await prisma.workingHours.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const exists = await prisma.workingHours.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  await prisma.workingHours.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
