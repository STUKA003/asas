import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { getEffectivePlan } from '../../lib/plans'

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  paymentLink: z.union([z.string().url(), z.literal('')]).optional(),
  intervalDays: z.number().int().positive(),
  allowedDays: z.array(z.number().int().min(0).max(6)).min(1),
  allowedServiceIds: z.array(z.string()).min(1),
  active: z.boolean().optional(),
})

function serializeAllowedDays(allowedDays: number[]) {
  return [...new Set(allowedDays)].sort((a, b) => a - b).join(',')
}

function parseAllowedDays(value: string) {
  return value
    .split(',')
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
}

function mapPlan<T extends { allowedDays: string }>(plan: T) {
  return {
    ...plan,
    allowedDays: parseAllowedDays(plan.allowedDays),
    allowedServices:
      'planServices' in plan && Array.isArray(plan.planServices)
        ? [...plan.planServices]
            .map((item) => item.service)
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
  }
}

const planInclude = {
  planServices: {
    include: {
      service: { select: { id: true, name: true } },
    },
  },
}

export async function list(req: Request, res: Response) {
  const items = await prisma.plan.findMany({
    where: { barbershopId: req.auth.barbershopId },
    include: planInclude,
    orderBy: { name: 'asc' },
  })
  res.json(items.map(mapPlan))
}

export async function get(req: Request, res: Response) {
  const item = await prisma.plan.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
    include: planInclude,
  })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(mapPlan(item))
}

export async function create(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const shop = await prisma.barbershop.findUnique({
    where: { id: req.auth.barbershopId },
    select: { subscriptionPlan: true, subscriptionEndsAt: true },
  })
  if (getEffectivePlan(shop?.subscriptionPlan ?? 'FREE', shop?.subscriptionEndsAt ?? null) === 'FREE') {
    res.status(403).json({ error: 'Plano BASIC ou superior necessário para criar planos de cliente.' })
    return
  }

  const services = await prisma.service.findMany({
    where: {
      id: { in: parsed.data.allowedServiceIds },
      barbershopId: req.auth.barbershopId,
      active: true,
    },
  })
  if (services.length !== parsed.data.allowedServiceIds.length) {
    res.status(422).json({ error: 'One or more services not found' })
    return
  }

  const item = await prisma.plan.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      paymentLink: parsed.data.paymentLink || null,
      intervalDays: parsed.data.intervalDays,
      allowedDays: serializeAllowedDays(parsed.data.allowedDays),
      active: parsed.data.active,
      barbershopId: req.auth.barbershopId,
      planServices: {
        create: parsed.data.allowedServiceIds.map((serviceId) => ({ serviceId })),
      },
    },
    include: planInclude,
  })
  res.status(201).json(mapPlan(item))
}

export async function update(req: Request, res: Response) {
  const parsed = schema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.plan.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  const { allowedDays, allowedServiceIds, ...rest } = parsed.data

  if (allowedServiceIds) {
    const services = await prisma.service.findMany({
      where: {
        id: { in: allowedServiceIds },
        barbershopId: req.auth.barbershopId,
        active: true,
      },
    })
    if (services.length !== allowedServiceIds.length) {
      res.status(422).json({ error: 'One or more services not found' })
      return
    }
  }

  const item = await prisma.plan.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(rest.paymentLink !== undefined ? { paymentLink: rest.paymentLink || null } : {}),
      ...(allowedDays ? { allowedDays: serializeAllowedDays(allowedDays) } : {}),
      ...(allowedServiceIds
        ? {
            planServices: {
              deleteMany: {},
              create: allowedServiceIds.map((serviceId) => ({ serviceId })),
            },
          }
        : {}),
    },
    include: planInclude,
  })
  res.json(mapPlan(item))
}

export async function remove(req: Request, res: Response) {
  const exists = await prisma.plan.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  await prisma.plan.delete({ where: { id: req.params.id } })
  res.status(204).send()
}

export async function report(req: Request, res: Response) {
  const { from, to } = req.query
  const fromDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const toDate = to ? new Date(to as string) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999)

  const [plans, bookings] = await Promise.all([
    prisma.plan.findMany({
      where: { barbershopId: req.auth.barbershopId },
      include: {
        customers: {
          select: { id: true, name: true },
        },
        planServices: {
          include: {
            service: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.booking.findMany({
      where: {
        barbershopId: req.auth.barbershopId,
        startTime: { gte: fromDate, lte: toDate },
        status: 'COMPLETED',
        customer: { planId: { not: null } },
      },
      select: {
        id: true,
        totalPrice: true,
        customerId: true,
        customer: { select: { planId: true } },
      },
    }),
  ])

  const bookingsByPlanId = new Map<string, { bookingsUsed: number; revenueFromBookings: number; activeCustomers: Set<string> }>()

  bookings.forEach((booking) => {
    const planId = booking.customer.planId
    if (!planId) return

    if (!bookingsByPlanId.has(planId)) {
      bookingsByPlanId.set(planId, { bookingsUsed: 0, revenueFromBookings: 0, activeCustomers: new Set() })
    }

    const stats = bookingsByPlanId.get(planId)!
    stats.bookingsUsed += 1
    stats.revenueFromBookings += booking.totalPrice
    stats.activeCustomers.add(booking.customerId)
  })

  const plansReport = plans.map((plan) => {
    const bookingStats = bookingsByPlanId.get(plan.id)
    const subscribers = plan.customers.length
    const bookingsUsed = bookingStats?.bookingsUsed ?? 0
    const activeCustomers = bookingStats?.activeCustomers.size ?? 0
    const inactiveSubscribers = Math.max(0, subscribers - activeCustomers)
    const estimatedRecurringRevenue = subscribers * plan.price

    return {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      intervalDays: plan.intervalDays,
      subscribers,
      activeCustomers,
      inactiveSubscribers,
      bookingsUsed,
      usagePerSubscriber: subscribers > 0 ? bookingsUsed / subscribers : 0,
      estimatedRecurringRevenue,
      revenueFromBookings: bookingStats?.revenueFromBookings ?? 0,
      allowedServicesCount: plan.planServices.length,
      active: plan.active,
    }
  }).sort((a, b) => b.subscribers - a.subscribers || b.estimatedRecurringRevenue - a.estimatedRecurringRevenue)

  const totalSubscribers = plansReport.reduce((sum, plan) => sum + plan.subscribers, 0)
  const totalEstimatedRecurringRevenue = plansReport.reduce((sum, plan) => sum + plan.estimatedRecurringRevenue, 0)
  const totalBookingsUsed = plansReport.reduce((sum, plan) => sum + plan.bookingsUsed, 0)
  const inactiveSubscribers = plansReport.reduce((sum, plan) => sum + plan.inactiveSubscribers, 0)

  const insights: string[] = []
  if (plansReport[0]) {
    insights.push(`${plansReport[0].name} é o plano com mais assinantes (${plansReport[0].subscribers}).`)
  }
  const mostUsedPlan = [...plansReport].sort((a, b) => b.usagePerSubscriber - a.usagePerSubscriber)[0]
  if (mostUsedPlan && mostUsedPlan.subscribers > 0) {
    insights.push(`${mostUsedPlan.name} tem a melhor utilização média (${mostUsedPlan.usagePerSubscriber.toFixed(1)} uso(s) por cliente).`)
  }
  if (inactiveSubscribers > 0) {
    insights.push(`${inactiveSubscribers} cliente(s) com plano não usaram o benefício no período.`)
  }

  res.json({
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    overview: {
      totalPlans: plans.length,
      activePlans: plansReport.filter((plan) => plan.active).length,
      totalSubscribers,
      totalEstimatedRecurringRevenue,
      totalBookingsUsed,
      inactiveSubscribers,
      averageUsagePerSubscriber: totalSubscribers > 0 ? totalBookingsUsed / totalSubscribers : 0,
    },
    plans: plansReport,
    insights,
  })
}
