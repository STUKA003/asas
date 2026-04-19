import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { getAvailableSlots, validateSlot } from '../../utils/availability'
import { createBooking } from './service'
import { addBookingItemsToBooking, removeBookingItemFromBooking } from './items-service'
import { buildBookingListWhere } from './filters'

const createSchema = z.object({
  barberId: z.string(),
  customerId: z.string(),
  serviceIds: z.array(z.string()).min(1),
  extraIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
})

const rescheduleSchema = z.object({
  startTime: z.string().datetime(),
  barberId:  z.string().optional(),
})

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

const bookingInclude = {
  barber: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, phone: true, plan: { select: { id: true, name: true } } } },
  services: { include: { service: { select: { id: true, name: true } } } },
  extras: { include: { extra: { select: { id: true, name: true } } } },
  products: { include: { product: { select: { id: true, name: true } } } },
}

export async function list(req: Request, res: Response) {
  const { barberId, customerId, status, date, q } = req.query
  const where = buildBookingListWhere({
    barbershopId: req.auth.barbershopId,
    barberId,
    customerId,
    status,
    date,
    q,
  })

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { startTime: 'asc' },
  })
  res.json(bookings)
}

export async function get(req: Request, res: Response) {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
    include: bookingInclude,
  })
  if (!booking) { res.status(404).json({ error: 'Not found' }); return }
  res.json(booking)
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  try {
    const booking = await createBooking({
      ...parsed.data,
      startTime: new Date(parsed.data.startTime),
      barbershopId: req.auth.barbershopId,
    })
    res.status(201).json(booking)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(422).json({ error: message })
  }
}

export async function updateStatus(req: Request, res: Response) {
  const parsed = updateStatusSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.booking.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
    include: bookingInclude,
  })
  res.json(booking)
}

export async function reschedule(req: Request, res: Response) {
  const parsed = rescheduleSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!booking) { res.status(404).json({ error: 'Not found' }); return }

  const barberId = parsed.data.barberId ?? booking.barberId

  if (parsed.data.barberId && parsed.data.barberId !== booking.barberId) {
    const barber = await prisma.barber.findFirst({
      where: { id: barberId, barbershopId: req.auth.barbershopId, active: true },
    })
    if (!barber) { res.status(422).json({ error: 'Barber not found or inactive' }); return }
  }

  const startTime = new Date(parsed.data.startTime)
  const endTime   = new Date(startTime.getTime() + booking.totalDuration * 60 * 1000)

  const slotError = await validateSlot(
    barberId,
    req.auth.barbershopId,
    startTime,
    endTime,
    booking.id  // exclude self so it doesn't conflict with its own current slot
  )
  if (slotError) { res.status(422).json({ error: slotError }); return }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data:  { startTime, endTime, barberId },
    include: bookingInclude,
  })
  res.json(updated)
}

export async function addItems(req: Request, res: Response) {
  const parsed = addItemsSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  try {
    const updated = await addBookingItemsToBooking({
      bookingId: req.params.id,
      barbershopId: req.auth.barbershopId,
      extraIds: parsed.data.extraIds ?? [],
      productIds: parsed.data.productIds ?? [],
      include: bookingInclude,
    })
    res.json(updated)
  } catch (error: unknown) {
    if (!(error instanceof Error)) throw error
    if (error.message === 'BOOKING_NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return }
    if (error.message === 'EXTRAS_NOT_FOUND') { res.status(422).json({ error: 'One or more extras not found' }); return }
    if (error.message === 'PRODUCTS_NOT_FOUND') { res.status(422).json({ error: 'One or more products not found' }); return }
    if (error.message.startsWith('PRODUCT_OUT_OF_STOCK:')) {
      res.status(422).json({ error: `Product out of stock: ${error.message.split(':').slice(1).join(':')}` })
      return
    }
    throw error
  }
}

export async function remove(req: Request, res: Response) {
  const exists = await prisma.booking.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  await prisma.booking.delete({ where: { id: req.params.id } })
  res.status(204).send()
}

export async function removeItem(req: Request, res: Response) {
  const parsed = removeItemSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  try {
    const updated = await removeBookingItemFromBooking({
      bookingId: req.params.id,
      barbershopId: req.auth.barbershopId,
      type: parsed.data.type,
      itemId: parsed.data.itemId,
      include: bookingInclude,
    })
    res.json(updated)
  } catch (error: unknown) {
    if (!(error instanceof Error)) throw error
    if (error.message === 'BOOKING_NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return }
    if (error.message === 'BOOKING_ITEM_NOT_FOUND') { res.status(404).json({ error: 'Item not found in booking' }); return }
    throw error
  }
}

export async function availability(req: Request, res: Response) {
  const { barberId, date, duration } = req.query

  if (!barberId || !date || !duration) {
    res.status(400).json({ error: 'barberId, date, and duration are required' })
    return
  }

  const barber = await prisma.barber.findFirst({
    where: { id: barberId as string, barbershopId: req.auth.barbershopId },
  })
  if (!barber) { res.status(404).json({ error: 'Barber not found' }); return }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.auth.barbershopId },
    select: { slotGranularityMinutes: true },
  })

  const slots = await getAvailableSlots(
    barberId as string,
    req.auth.barbershopId,
    date as string,
    Number(duration),
    barbershop?.slotGranularityMinutes ?? 15
  )

  res.json({ barberId, date, durationMinutes: Number(duration), slots })
}
