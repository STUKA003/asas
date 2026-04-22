import { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { buildCustomerListWhere } from './filters'
import { computeCustomerInsights } from '../../lib/customer-insights'

const emptyToNull = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const createSchema = z.object({
  name: z.string().trim().min(2),
  email: z.preprocess(emptyToNull, z.union([z.string().email(), z.null()])).optional(),
  phone: z.preprocess(emptyToNull, z.union([z.string(), z.null()])).optional(),
  notes: z.preprocess(emptyToNull, z.union([z.string(), z.null()])).optional(),
  planId: z.preprocess(emptyToNull, z.union([z.string(), z.null()])).optional(),
})

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.preprocess(emptyToNull, z.union([z.string().email(), z.null()])).optional(),
  phone: z.preprocess(emptyToNull, z.union([z.string(), z.null()])).optional(),
  notes: z.preprocess(emptyToNull, z.union([z.string(), z.null()])).optional(),
  planId: z.preprocess(emptyToNull, z.union([z.string(), z.null()])).optional(),
})

const importRowSchema = z.object({
  name: z.string().trim().min(2),
  email: z.preprocess(emptyToNull, z.union([z.string().email(), z.null()])).optional(),
  phone: z.preprocess(emptyToNull, z.union([z.string(), z.null()])).optional(),
  notes: z.preprocess(emptyToNull, z.union([z.string(), z.null()])).optional(),
})

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(5000),
})

function handleCustomerWriteError(error: unknown, res: Response) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    res.status(409).json({ error: 'Já existe um cliente com esse telefone.' })
    return true
  }

  return false
}

export async function list(req: Request, res: Response) {
  const { q, planId, hasPlan } = req.query
  const where = buildCustomerListWhere({
    barbershopId: req.auth.barbershopId,
    q,
    planId,
    hasPlan,
  })

  const items = await prisma.customer.findMany({
    where,
    include: { plan: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  })

  const bookings = await prisma.booking.findMany({
    where: {
      barbershopId: req.auth.barbershopId,
      customerId: { in: items.map((item) => item.id) },
    },
    select: {
      customerId: true,
      status: true,
      totalPrice: true,
      startTime: true,
    },
  })

  const bookingsByCustomer = new Map<string, Array<{ startTime: Date; status: string; totalPrice: number }>>()
  for (const booking of bookings) {
    const list = bookingsByCustomer.get(booking.customerId) ?? []
    list.push({
      startTime: booking.startTime,
      status: booking.status,
      totalPrice: booking.totalPrice,
    })
    bookingsByCustomer.set(booking.customerId, list)
  }

  res.json(items.map((item) => ({
    ...item,
    insights: computeCustomerInsights(bookingsByCustomer.get(item.id) ?? []),
  })))
}

export async function get(req: Request, res: Response) {
  const item = await prisma.customer.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
    include: {
      plan: {
        include: {
          planServices: { include: { service: { select: { id: true, name: true } } } },
        },
      },
      bookings: {
        orderBy: { startTime: 'desc' },
        take: 10,
        include: {
          barber: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }

  const allBookings = await prisma.booking.findMany({
    where: { customerId: item.id, barbershopId: req.auth.barbershopId },
    select: { startTime: true, status: true, totalPrice: true },
  })

  res.json({
    ...item,
    insights: computeCustomerInsights(allBookings),
    plan: item.plan
      ? {
          ...item.plan,
          allowedDays: item.plan.allowedDays
            .split(',')
            .map(Number)
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
          allowedServices: item.plan.planServices.map((ps) => ps.service),
        }
      : null,
  })
}

export async function importCustomers(req: Request, res: Response) {
  const parsed = importSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const rows = parsed.data.rows
  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const name = row.name.trim()
    const email = row.email ?? null
    const phone = row.phone ?? null
    const notes = row.notes ?? null

    if (!name) {
      skipped += 1
      continue
    }

    if (phone) {
      const existing = await prisma.customer.findFirst({
        where: {
          barbershopId: req.auth.barbershopId,
          phone,
        },
      })

      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { name, email, notes },
        })
        updated += 1
        continue
      }
    }

    try {
      await prisma.customer.create({
        data: {
          barbershopId: req.auth.barbershopId,
          name,
          email,
          phone,
          notes,
        },
      })
      created += 1
    } catch (error) {
      if (handleCustomerWriteError(error, res)) return
      throw error
    }
  }

  res.json({
    created,
    updated,
    skipped,
    total: rows.length,
  })
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  try {
    const item = await prisma.customer.create({
      data: { ...parsed.data, barbershopId: req.auth.barbershopId },
    })
    res.status(201).json(item)
  } catch (error) {
    if (handleCustomerWriteError(error, res)) return
    throw error
  }
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.customer.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  try {
    const item = await prisma.customer.update({ where: { id: req.params.id }, data: parsed.data })
    res.json(item)
  } catch (error) {
    if (handleCustomerWriteError(error, res)) return
    throw error
  }
}

export async function remove(req: Request, res: Response) {
  const exists = await prisma.customer.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  const bookings = await prisma.booking.findMany({
    where: { customerId: req.params.id },
    select: { id: true },
  })
  const bookingIds = bookings.map(b => b.id)

  await prisma.$transaction([
    prisma.bookingService.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.bookingExtra.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.bookingProduct.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.booking.deleteMany({ where: { customerId: req.params.id } }),
    prisma.customer.delete({ where: { id: req.params.id } }),
  ])

  res.status(204).send()
}
