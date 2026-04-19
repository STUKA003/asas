import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { getAvailableSlots } from '../../utils/availability'
import { createBooking } from '../bookings/service'
import { getEffectivePlan } from '../../lib/plans'
import { normalizePublicShop, resolvePublicTenant } from './tenant'
import { serializeCustomerPlanLookup, serializePublicPlan } from './serializers'

// ─── Public handlers ─────────────────────────────────────────────────────────

export async function getBarbershop(req: Request, res: Response) {
  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }
  const normalized = normalizePublicShop(shop)
  // Expõe o plano efectivo (já calcula expiração) sem expor dados internos
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

export async function lookupCustomerPlan(req: Request, res: Response) {
  const phone = String(req.query.phone ?? '').trim()
  if (!phone) {
    res.status(400).json({ error: 'phone is required' })
    return
  }

  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const customer = await prisma.customer.findFirst({
    where: { phone, barbershopId: shop.id },
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

const subscribePlanSchema = z.object({
  planId: z.string().min(1),
  name:   z.string().min(2),
  phone:  z.string().min(7),
})

export async function subscribePlan(req: Request, res: Response) {
  const parsed = subscribePlanSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const { planId, name, phone } = parsed.data

  const plan = await prisma.plan.findFirst({ where: { id: planId, barbershopId: shop.id, active: true } })
  if (!plan) { res.status(404).json({ error: 'Plano não encontrado.' }); return }

  const customer = await prisma.customer.upsert({
    where: { phone_barbershopId: { phone, barbershopId: shop.id } },
    update: { planId: plan.id },
    create: { name, phone, barbershopId: shop.id, planId: plan.id },
    select: { id: true, name: true, phone: true, planId: true },
  })

  res.json({ customer, plan: { id: plan.id, name: plan.name } })
}

export async function getAvailability(req: Request, res: Response) {
  const { barberId, date, duration } = req.query

  if (!barberId || !date || !duration) {
    res.status(400).json({ error: 'barberId, date and duration are required' })
    return
  }

  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const barber = await prisma.barber.findFirst({
    where: { id: barberId as string, barbershopId: shop.id, active: true },
  })
  if (!barber) { res.status(404).json({ error: 'Barber not found' }); return }

  const slots = await getAvailableSlots(
    barberId as string,
    shop.id,
    date as string,
    Number(duration),
    shop.slotGranularityMinutes
  )

  res.json({ barberId, date, durationMinutes: Number(duration), slots })
}

const bookingSchema = z.object({
  barberId:   z.string(),
  serviceIds: z.array(z.string()).min(1),
  extraIds:   z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  startTime:  z.string().datetime(),
  customer: z.object({
    name:  z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email().optional().or(z.literal('')),
    notes: z.string().optional(),
  }),
})

export async function createPublicBooking(req: Request, res: Response) {
  const parsed = bookingSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const shop = await resolvePublicTenant(req.params.slug)
  if (!shop) { res.status(404).json({ error: 'Barbershop not found' }); return }

  const { barberId, serviceIds, extraIds, productIds, startTime, customer: customerData } = parsed.data

  // Find or create customer by phone within this barbershop
  let customer = await prisma.customer.findFirst({
    where: { phone: customerData.phone, barbershopId: shop.id },
  })

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name:         customerData.name,
        phone:        customerData.phone,
        email:        customerData.email || undefined,
        barbershopId: shop.id,
      },
    })
  } else if (customer.name !== customerData.name) {
    // Update name if customer exists but name changed
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: customerData.name, email: customerData.email || undefined },
    })
  }

  try {
    const booking = await createBooking({
      barbershopId: shop.id,
      barberId,
      customerId:   customer.id,
      serviceIds,
      extraIds:     extraIds ?? [],
      productIds:   productIds ?? [],
      startTime:    new Date(startTime),
      notes:        customerData.notes,
    })
    res.status(201).json(booking)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(422).json({ error: message })
  }
}
