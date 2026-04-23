import { Prisma } from '@prisma/client'
import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { getAvailableSlots, validateSlot } from '../../utils/availability'
import { createBooking } from '../bookings/service'
import { getEffectivePlan } from '../../lib/plans'
import { normalizePublicShop, resolvePublicTenant } from './tenant'
import { serializeCustomerPlanLookup, serializePublicPlan } from './serializers'
import { notifyBookingCreated, notifyCustomerBookingAction } from '../../lib/booking-notifications'
import { issueBookingManagementToken, verifyBookingManagementToken } from '../../lib/booking-management'

const bookingManageTokenSchema = z.object({
  token: z.string().min(1),
})

const bookingManageAvailabilitySchema = z.object({
  token: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const bookingManageStartTimeSchema = z.object({
  token: z.string().min(1),
  startTime: z.string().datetime(),
})

const availabilityQuerySchema = z.object({
  barberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().positive(),
})

// ─── Public handlers ─────────────────────────────────────────────────────────

export async function getBarbershop(req: Request, res: Response) {
  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }
  const normalized = normalizePublicShop(shop)
  const { subscriptionPlan, subscriptionEndsAt, ...publicShop } = normalized
  res.json({ ...publicShop, plan: getEffectivePlan(subscriptionPlan, subscriptionEndsAt) })
}

export async function getServices(req: Request, res: Response) {
  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const services = await prisma.service.findMany({
    where: { barbershopId: shop.id, active: true },
    orderBy: { name: 'asc' },
  })
  res.json(services)
}

export async function getBarbers(req: Request, res: Response) {
  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const barbers = await prisma.barber.findMany({
    where: { barbershopId: shop.id, active: true },
    select: { id: true, name: true, avatar: true },
    orderBy: { name: 'asc' },
  })
  res.json(barbers)
}

export async function getExtras(req: Request, res: Response) {
  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  if (getEffectivePlan(shop.subscriptionPlan, shop.subscriptionEndsAt) === 'FREE') {
    res.json([])
    return
  }

  const extras = await prisma.extra.findMany({
    where: { barbershopId: shop.id, active: true },
    orderBy: { name: 'asc' },
  })
  res.json(extras)
}

export async function getProducts(req: Request, res: Response) {
  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }
  if (shop.showProducts === false) { res.json([]); return }
  if (getEffectivePlan(shop.subscriptionPlan, shop.subscriptionEndsAt) === 'FREE') { res.json([]); return }

  const products = await prisma.product.findMany({
    where: { barbershopId: shop.id, active: true },
    orderBy: { name: 'asc' },
  })
  res.json(products)
}

export async function getPlans(req: Request, res: Response) {
  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }
  if (shop.showPlans === false) { res.json([]); return }
  if (getEffectivePlan(shop.subscriptionPlan, shop.subscriptionEndsAt) === 'FREE') { res.json([]); return }

  const plans = await prisma.plan.findMany({
    where: { barbershopId: shop.id, active: true },
    include: {
      planServices: {
        include: {
          service: { select: { id: true, name: true } },
        },
        orderBy: { service: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  })
  res.json(plans.map(serializePublicPlan))
}

const customerPlanLookupSchema = z.object({
  phone: z.string().min(8),
  name: z.string().min(2),
})

const customerBookingsLookupSchema = z.object({
  phone: z.string().min(8),
  name: z.string().min(2),
})

export async function lookupCustomerPlan(req: Request, res: Response) {
  const parsed = customerPlanLookupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const customer = await prisma.customer.findFirst({
    where: {
      phone: parsed.data.phone,
      barbershopId: shop.id,
      name: { equals: parsed.data.name.trim(), mode: 'insensitive' },
    },
    include: {
      plan: {
        include: {
          planServices: {
            include: {
              service: { select: { id: true, name: true } },
            },
          },
        },
      },
      bookings: {
        where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        orderBy: { startTime: 'asc' },
        take: 1,
        select: { id: true, startTime: true, status: true },
      },
    },
  })

  if (!customer) {
    res.json({ customer: null })
    return
  }

  res.json({ customer: serializeCustomerPlanLookup(customer) })
}

export async function lookupCustomerBookings(req: Request, res: Response) {
  const parsed = customerBookingsLookupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const customer = await prisma.customer.findFirst({
    where: {
      phone: parsed.data.phone,
      barbershopId: shop.id,
      name: { equals: parsed.data.name.trim(), mode: 'insensitive' },
    },
    select: { id: true, name: true, phone: true, email: true },
  })

  if (!customer) {
    res.json({ customer: null, bookings: [] })
    return
  }

  const bookings = await prisma.booking.findMany({
    where: {
      customerId: customer.id,
      barbershopId: shop.id,
    },
    include: {
      barber: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      services: { include: { service: { select: { id: true, name: true } } } },
      extras: { include: { extra: { select: { id: true, name: true } } } },
      products: { include: { product: { select: { id: true, name: true } } } },
    },
    orderBy: [
      { startTime: 'asc' },
      { createdAt: 'desc' },
    ],
    take: 12,
  })

  res.json({
    customer,
    bookings,
  })
}

const subscribePlanSchema = z.object({
  planId: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().min(7),
})

export async function subscribePlan(req: Request, res: Response) {
  const parsed = subscribePlanSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  res.status(403).json({
    error: 'A subscrição pública de planos está indisponível sem confirmação de pagamento. Usa o link de pagamento da barbearia ou ativa o plano no painel.',
  })
}

export async function getAvailability(req: Request, res: Response) {
  const parsed = availabilityQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const barber = await prisma.barber.findFirst({
    where: { id: parsed.data.barberId, barbershopId: shop.id, active: true },
  })
  if (!barber) { res.status(404).json({ error: 'Barber not found' }); return }

  const slots = await getAvailableSlots(
    parsed.data.barberId,
    shop.id,
    parsed.data.date,
    parsed.data.duration,
    shop.slotGranularityMinutes
  )

  res.json({
    barberId: parsed.data.barberId,
    date: parsed.data.date,
    durationMinutes: parsed.data.duration,
    slots,
  })
}

const bookingSchema = z.object({
  barberId: z.string(),
  serviceIds: z.array(z.string()).min(1),
  extraIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  startTime: z.string().datetime(),
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email().optional().or(z.literal('')),
    notes: z.string().optional(),
  }),
})

function buildBookingManagementResponse(slug: string, bookingId: string, barbershopId: string) {
  const managementToken = issueBookingManagementToken(bookingId, barbershopId)
  const appUrl = process.env.APP_URL?.trim().replace(/\/+$/, '') ?? ''
  return {
    managementToken,
    managementUrl: `${appUrl}/${slug}/booking/manage?token=${managementToken}`,
  }
}

type ManagedBookingRecord = Prisma.BookingGetPayload<{
  include: {
    barber: { select: { id: true, name: true } }
    customer: { select: { id: true, name: true, phone: true, email: true } }
    services: { include: { service: { select: { id: true, name: true } } } }
    extras: { include: { extra: { select: { id: true, name: true } } } }
    products: { include: { product: { select: { id: true, name: true } } } }
  }
}>

async function findManagedBooking(slug: string, token: string) {
  const shop = await resolvePublicTenant(slug)
  if (!shop) return { error: 'Barbershop not found' as const }

  let payload
  try {
    payload = verifyBookingManagementToken(token)
  } catch {
    return { error: 'Invalid booking token' as const }
  }

  if (payload.barbershopId !== shop.id) {
    return { error: 'Invalid booking token' as const }
  }

  const booking = await prisma.booking.findFirst({
    where: { id: payload.bookingId, barbershopId: shop.id },
    include: {
      barber: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      services: { include: { service: { select: { id: true, name: true } } } },
      extras: { include: { extra: { select: { id: true, name: true } } } },
      products: { include: { product: { select: { id: true, name: true } } } },
    },
  })

  if (!booking) return { error: 'Booking not found' as const }
  return { booking, shop }
}

function serializeManagedBooking(slug: string, booking: ManagedBookingRecord) {
  return {
    ...booking,
    management: buildBookingManagementResponse(slug, booking.id, booking.barbershopId),
    canConfirm: booking.status === 'PENDING',
    canCancel: ['PENDING', 'CONFIRMED'].includes(booking.status),
    canReschedule: ['PENDING', 'CONFIRMED'].includes(booking.status),
  }
}

export async function createPublicBooking(req: Request, res: Response) {
  const parsed = bookingSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const { barberId, serviceIds, extraIds, productIds, startTime, customer: customerData } = parsed.data

  let customer = await prisma.customer.findFirst({
    where: { phone: customerData.phone, barbershopId: shop.id },
  })

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || undefined,
        barbershopId: shop.id,
      },
    })
  } else if (customer.name !== customerData.name) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: customerData.name, email: customerData.email || undefined },
    })
  }

  try {
    const booking = await createBooking({
      barbershopId: shop.id,
      barberId,
      customerId: customer.id,
      serviceIds,
      extraIds: extraIds ?? [],
      productIds: productIds ?? [],
      startTime: new Date(startTime),
      notes: customerData.notes,
    })

    await notifyBookingCreated({
      barbershopId: shop.id,
      barberId: booking.barber.id,
      bookingId: booking.id,
      customerName: booking.customer.name,
      source: 'public',
      startTime: new Date(booking.startTime),
    })

    res.status(201).json({
      ...booking,
      management: buildBookingManagementResponse(req.params.slug, booking.id, shop.id),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(422).json({ error: message })
  }
}

export async function getManagedBooking(req: Request, res: Response) {
  const parsed = bookingManageTokenSchema.safeParse(req.query)
  if (!parsed.success) { res.status(400).json({ error: 'token is required' }); return }

  const result = await findManagedBooking(req.params.slug, parsed.data.token)
  if ('error' in result) {
    res.status(result.error === 'Barbershop not found' ? 404 : 401).json({ error: result.error })
    return
  }

  res.json({ booking: serializeManagedBooking(req.params.slug, result.booking) })
}

export async function getManagedBookingAvailability(req: Request, res: Response) {
  const parsed = bookingManageAvailabilitySchema.safeParse(req.query)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const result = await findManagedBooking(req.params.slug, parsed.data.token)
  if ('error' in result) {
    res.status(result.error === 'Barbershop not found' ? 404 : 401).json({ error: result.error })
    return
  }

  const { booking, shop } = result
  const slots = await getAvailableSlots(
    booking.barberId,
    shop.id,
    parsed.data.date,
    booking.totalDuration,
    shop.slotGranularityMinutes,
    booking.id
  )

  res.json({
    barberId: booking.barberId,
    date: parsed.data.date,
    durationMinutes: booking.totalDuration,
    slots,
  })
}

export async function confirmManagedBooking(req: Request, res: Response) {
  const parsed = bookingManageTokenSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const result = await findManagedBooking(req.params.slug, parsed.data.token)
  if ('error' in result) {
    res.status(result.error === 'Barbershop not found' ? 404 : 401).json({ error: result.error })
    return
  }

  const { booking } = result
  if (booking.status === 'CANCELLED') {
    res.status(422).json({ error: 'Booking is already cancelled' })
    return
  }

  const updated = booking.status === 'CONFIRMED'
    ? booking
    : await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' },
        include: {
          barber: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true, email: true } },
          services: { include: { service: { select: { id: true, name: true } } } },
          extras: { include: { extra: { select: { id: true, name: true } } } },
          products: { include: { product: { select: { id: true, name: true } } } },
        },
      })

  if (booking.status !== 'CONFIRMED') {
    await notifyCustomerBookingAction({
      barbershopId: updated.barbershopId,
      barberId: updated.barber.id,
      bookingId: updated.id,
      customerName: updated.customer.name,
      kind: 'confirmed',
    })
  }

  res.json({ booking: serializeManagedBooking(req.params.slug, updated) })
}

export async function cancelManagedBooking(req: Request, res: Response) {
  const parsed = bookingManageTokenSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const result = await findManagedBooking(req.params.slug, parsed.data.token)
  if ('error' in result) {
    res.status(result.error === 'Barbershop not found' ? 404 : 401).json({ error: result.error })
    return
  }

  const { booking } = result
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    res.status(422).json({ error: 'Booking can no longer be cancelled' })
    return
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED' },
    include: {
      barber: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      services: { include: { service: { select: { id: true, name: true } } } },
      extras: { include: { extra: { select: { id: true, name: true } } } },
      products: { include: { product: { select: { id: true, name: true } } } },
    },
  })

  await notifyCustomerBookingAction({
    barbershopId: updated.barbershopId,
    barberId: updated.barber.id,
    bookingId: updated.id,
    customerName: updated.customer.name,
    kind: 'cancelled',
  })

  res.json({ booking: serializeManagedBooking(req.params.slug, updated) })
}

export async function rescheduleManagedBooking(req: Request, res: Response) {
  const parsed = bookingManageStartTimeSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const result = await findManagedBooking(req.params.slug, parsed.data.token)
  if ('error' in result) {
    res.status(result.error === 'Barbershop not found' ? 404 : 401).json({ error: result.error })
    return
  }

  const { booking, shop } = result
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    res.status(422).json({ error: 'Booking can no longer be rescheduled' })
    return
  }

  const startTime = new Date(parsed.data.startTime)
  const endTime = new Date(startTime.getTime() + booking.totalDuration * 60 * 1000)
  const slotError = await validateSlot(booking.barberId, shop.id, startTime, endTime, booking.id)
  if (slotError) {
    res.status(422).json({ error: slotError })
    return
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { startTime, endTime },
    include: {
      barber: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      services: { include: { service: { select: { id: true, name: true } } } },
      extras: { include: { extra: { select: { id: true, name: true } } } },
      products: { include: { product: { select: { id: true, name: true } } } },
    },
  })

  await notifyCustomerBookingAction({
    barbershopId: updated.barbershopId,
    barberId: updated.barber.id,
    bookingId: updated.id,
    customerName: updated.customer.name,
    kind: 'rescheduled',
    startTime,
  })

  res.json({ booking: serializeManagedBooking(req.params.slug, updated) })
}
