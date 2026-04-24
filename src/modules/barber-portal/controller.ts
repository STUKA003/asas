import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { getEffectivePlan } from '../../lib/plans'
import { validateSlot } from '../../utils/availability'
import { addBookingItemsToBooking, removeBookingItemFromBooking } from '../bookings/items-service'
import { sendNotificationPush } from '../../lib/push'
import { formatStoredWallClockTime } from '../../lib/datetime'

function fmtTime(d: Date) {
  return formatStoredWallClockTime(d)
}

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'confirmou',
  COMPLETED: 'marcou como concluído',
  CANCELLED: 'cancelou',
  NO_SHOW:   'marcou como não compareceu',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
}

const bookingInclude = {
  barber:   { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, phone: true, plan: { select: { id: true, name: true } } } },
  services: { include: { service: { select: { id: true, name: true } } } },
  extras:   { include: { extra:   { select: { id: true, name: true } } } },
  products: { include: { product: { select: { id: true, name: true } } } },
}

const addItemsSchema = z.object({
  extraIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
}).refine((data) => (data.extraIds?.length ?? 0) > 0 || (data.productIds?.length ?? 0) > 0, {
  message: 'At least one extra or product is required',
})

const removeItemSchema = z.object({
  type: z.enum(['extra', 'product']),
  itemId: z.string().min(1),
})

async function getPortalPlan(barbershopId: string) {
  const shop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
    select: { subscriptionPlan: true, subscriptionEndsAt: true },
  })

  return getEffectivePlan(shop?.subscriptionPlan ?? 'FREE', shop?.subscriptionEndsAt ?? null)
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return new Date(value)

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
}

function localDateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-')
}

export async function getMyBookings(req: Request, res: Response) {
  const { barberId, barbershopId } = req.barberAuth
  const { date, from, to } = req.query

  const where: Record<string, unknown> = { barberId, barbershopId }

  if (from && to) {
    const start = parseDateOnly(from as string); start.setHours(0, 0, 0, 0)
    const end   = parseDateOnly(to as string);   end.setHours(23, 59, 59, 999)
    where.startTime = { gte: start, lte: end }
  } else if (date) {
    const d = parseDateOnly(date as string)
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end   = new Date(d); end.setHours(23, 59, 59, 999)
    where.startTime = { gte: start, lte: end }
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { startTime: 'asc' },
  })

  res.json(bookings)
}

export async function getMyStats(req: Request, res: Response) {
  const { barberId, barbershopId } = req.barberAuth
  const now = new Date()

  // Today
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  // This week (Mon–Sun)
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dayOfWeek); weekStart.setHours(0, 0, 0, 0)
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999)

  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [todayBookings, weekBookings, monthBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { barberId, barbershopId, startTime: { gte: todayStart, lte: todayEnd } },
      select: { status: true, totalPrice: true },
    }),
    prisma.booking.findMany({
      where: { barberId, barbershopId, startTime: { gte: weekStart, lte: weekEnd } },
      select: { status: true, totalPrice: true, startTime: true },
    }),
    prisma.booking.findMany({
      where: { barberId, barbershopId, startTime: { gte: monthStart, lte: monthEnd }, status: 'COMPLETED' },
      select: { totalPrice: true },
    }),
  ])

  const todayRevenue  = todayBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + b.totalPrice, 0)
  const todayCount    = todayBookings.filter(b => ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(b.status)).length
  const weekRevenue   = weekBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + b.totalPrice, 0)
  const monthRevenue  = monthBookings.reduce((s, b) => s + b.totalPrice, 0)

  // Bookings per day of current week for mini-chart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
    return localDateKey(d)
  })
  const perDay = weekDays.map(day => ({
    date: day,
    count: weekBookings.filter(b =>
      localDateKey(b.startTime) === day &&
      ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(b.status)
    ).length,
  }))

  res.json({ todayRevenue, todayCount, weekRevenue, monthRevenue, perDay })
}

export async function getAvailableExtras(req: Request, res: Response) {
  const plan = await getPortalPlan(req.barberAuth.barbershopId)
  if (plan === 'FREE') {
    res.status(403).json({ error: 'Plano BASIC ou superior necessário para usar extras.' })
    return
  }

  const items = await prisma.extra.findMany({
    where: { barbershopId: req.barberAuth.barbershopId, active: true },
    orderBy: { name: 'asc' },
  })

  res.json(items)
}

export async function getAvailableProducts(req: Request, res: Response) {
  const plan = await getPortalPlan(req.barberAuth.barbershopId)
  if (plan === 'FREE') {
    res.status(403).json({ error: 'Plano BASIC ou superior necessário para usar produtos.' })
    return
  }

  const items = await prisma.product.findMany({
    where: { barbershopId: req.barberAuth.barbershopId, active: true, stock: { gt: 0 } },
    orderBy: { name: 'asc' },
  })

  res.json(items)
}

export async function updateBookingStatus(req: Request, res: Response) {
  const { barberId, barbershopId } = req.barberAuth
  const parsed = z.object({ status: z.string() }).safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Status inválido' }); return }

  const { status } = parsed.data
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, barberId, barbershopId },
    include: {
      customer: { select: { name: true } },
      barber:   { select: { name: true } },
    },
  })
  if (!booking) { res.status(404).json({ error: 'Not found' }); return }

  const allowed = VALID_TRANSITIONS[booking.status] ?? []
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `Não podes mudar de ${booking.status} para ${status}` })
    return
  }

  const updated = await prisma.booking.update({ where: { id: req.params.id }, data: { status } })

  const bookingClientName = booking.attendeeName?.trim() || booking.customer.name
  const message = `${booking.barber.name} ${STATUS_LABELS[status] ?? 'alterou'} o agendamento de ${bookingClientName}`

  await prisma.notification.create({
    data: {
      barbershopId,
      barberId,
      type:      `BOOKING_${status}`,
      message,
      bookingId: booking.id,
    },
  })

  await sendNotificationPush({
    barbershopId,
    barberId,
    bookingId: booking.id,
    body: message,
  })

  res.json(updated)
}

export async function rescheduleBooking(req: Request, res: Response) {
  const { barberId, barbershopId } = req.barberAuth
  const parsed = z.object({ startTime: z.string() }).safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'startTime inválido' }); return }

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, barberId, barbershopId },
    include: {
      customer: { select: { name: true } },
      barber:   { select: { name: true } },
    },
  })
  if (!booking) { res.status(404).json({ error: 'Not found' }); return }
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    res.status(422).json({ error: 'Só podes remarcar agendamentos pendentes ou confirmados.' })
    return
  }

  const newStart   = new Date(parsed.data.startTime)
  const duration   = booking.endTime.getTime() - booking.startTime.getTime()
  const newEnd     = new Date(newStart.getTime() + duration)
  const oldTimeStr = fmtTime(booking.startTime)
  const newTimeStr = fmtTime(newStart)

  const slotError = await validateSlot(barberId, barbershopId, newStart, newEnd, booking.id)
  if (slotError) {
    res.status(422).json({ error: slotError })
    return
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { startTime: newStart, endTime: newEnd },
  })

  const bookingClientName = booking.attendeeName?.trim() || booking.customer.name
  const message = `${booking.barber.name} remarcou o agendamento de ${bookingClientName} das ${oldTimeStr} para as ${newTimeStr}`

  await prisma.notification.create({
    data: {
      barbershopId,
      barberId,
      type:      'BOOKING_RESCHEDULED',
      message,
      bookingId: booking.id,
    },
  })

  await sendNotificationPush({
    barbershopId,
    barberId,
    bookingId: booking.id,
    body: message,
  })

  res.json(updated)
}

export async function addBookingItems(req: Request, res: Response) {
  const { barberId, barbershopId } = req.barberAuth
  const parsed = addItemsSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const plan = await getPortalPlan(barbershopId)
  if (plan === 'FREE') {
    res.status(403).json({ error: 'Plano BASIC ou superior necessário para adicionar extras ou produtos.' })
    return
  }

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, barberId, barbershopId },
  })
  if (!booking) { res.status(404).json({ error: 'Not found' }); return }

  try {
    const updated = await addBookingItemsToBooking({
      bookingId: req.params.id,
      barbershopId,
      extraIds: parsed.data.extraIds ?? [],
      productIds: parsed.data.productIds ?? [],
      include: bookingInclude,
    })
    res.json(updated)
  } catch (error: unknown) {
    if (!(error instanceof Error)) throw error
    if (error.message === 'EXTRAS_NOT_FOUND') { res.status(422).json({ error: 'One or more extras not found' }); return }
    if (error.message === 'PRODUCTS_NOT_FOUND') { res.status(422).json({ error: 'One or more products not found' }); return }
    if (error.message.startsWith('Time slot ')) { res.status(422).json({ error: error.message }); return }
    if (error.message === 'Barber already has a booking in this time slot') { res.status(422).json({ error: error.message }); return }
    if (error.message === 'Time slot is blocked') { res.status(422).json({ error: error.message }); return }
    if (error.message === 'Time slot is in the past') { res.status(422).json({ error: error.message }); return }
    if (error.message.startsWith('PRODUCT_OUT_OF_STOCK:')) {
      res.status(422).json({ error: `Product out of stock: ${error.message.split(':').slice(1).join(':')}` })
      return
    }
    throw error
  }
}

export async function removeBookingItem(req: Request, res: Response) {
  const { barberId, barbershopId } = req.barberAuth
  const parsed = removeItemSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const plan = await getPortalPlan(barbershopId)
  if (plan === 'FREE') {
    res.status(403).json({ error: 'Plano BASIC ou superior necessário para remover extras ou produtos.' })
    return
  }

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, barberId, barbershopId },
  })
  if (!booking) { res.status(404).json({ error: 'Not found' }); return }

  try {
    const updated = await removeBookingItemFromBooking({
      bookingId: req.params.id,
      barbershopId,
      type: parsed.data.type,
      itemId: parsed.data.itemId,
      include: bookingInclude,
    })
    res.json(updated)
  } catch (error: unknown) {
    if (!(error instanceof Error)) throw error
    if (error.message === 'BOOKING_ITEM_NOT_FOUND') { res.status(404).json({ error: 'Item not found in booking' }); return }
    throw error
  }
}

export async function listNotifications(req: Request, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: {
      barbershopId: req.barberAuth.barbershopId,
      barberId: req.barberAuth.barberId,
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })

  res.json(notifications)
}

export async function unreadNotificationsCount(req: Request, res: Response) {
  const count = await prisma.notification.count({
    where: {
      barbershopId: req.barberAuth.barbershopId,
      barberId: req.barberAuth.barberId,
      read: false,
    },
  })

  res.json({ count })
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  await prisma.notification.updateMany({
    where: {
      barbershopId: req.barberAuth.barbershopId,
      barberId: req.barberAuth.barberId,
      read: false,
    },
    data: { read: true },
  })

  res.json({ ok: true })
}
