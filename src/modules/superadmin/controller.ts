import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { PLAN_LIMITS, type SubscriptionPlan } from '../../lib/plans'

function timingSafeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body

  const validEmail = timingSafeEqual(String(email ?? ''), process.env.SUPERADMIN_EMAIL ?? '')
  const validPassword = timingSafeEqual(String(password ?? ''), process.env.SUPERADMIN_PASSWORD ?? '')

  if (!validEmail || !validPassword) {
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const token = jwt.sign(
    { role: 'SUPERADMIN' },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  )

  res.json({ token, role: 'SUPERADMIN' })
}

export async function stats(req: Request, res: Response) {
  const [totalBarbershops, totalBookings, totalCustomers, planCounts] = await Promise.all([
    prisma.barbershop.count(),
    prisma.booking.count(),
    prisma.customer.count(),
    prisma.barbershop.groupBy({ by: ['subscriptionPlan'], _count: { _all: true } }),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const bookingsThisMonth = await prisma.booking.count({
    where: { startTime: { gte: monthStart } },
  })

  res.json({
    totalBarbershops,
    totalBookings,
    totalCustomers,
    bookingsThisMonth,
    planCounts: planCounts.map((p) => ({ plan: p.subscriptionPlan, count: p._count._all })),
  })
}

export async function listBarbershops(req: Request, res: Response) {
  const { q } = req.query

  const barbershops = await prisma.barbershop.findMany({
    where: q ? { name: { contains: String(q) } } : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      suspended: true,
      suspendedReason: true,
      subscriptionPlan: true,
      subscriptionEndsAt: true,
      createdAt: true,
      _count: { select: { barbers: true, bookings: true, customers: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(barbershops)
}

const subscriptionSchema = z.object({
  plan: z.enum(['FREE', 'BASIC', 'PRO']),
  endsAt: z.string().datetime().nullable().optional(),
})

const barbershopDetailsSchema = z.object({
  name: z.string().min(2, 'O nome tem de ter pelo menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'O slug tem de ter pelo menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'O slug só pode ter letras minúsculas, números e hífen'),
})

export async function updateBarbershopSubscription(req: Request, res: Response) {
  const parsed = subscriptionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.barbershop.findUnique({ where: { id: req.params.id } })
  if (!exists) { res.status(404).json({ error: 'Barbearia não encontrada' }); return }

  const barbershop = await prisma.barbershop.update({
    where: { id: req.params.id },
    data: {
      subscriptionPlan: parsed.data.plan,
      subscriptionEndsAt: parsed.data.endsAt !== undefined
        ? (parsed.data.endsAt ? new Date(parsed.data.endsAt) : null)
        : undefined,
    },
    select: { id: true, name: true, subscriptionPlan: true, subscriptionEndsAt: true, suspended: true },
  })

  res.json(barbershop)
}

export async function updateBarbershopDetails(req: Request, res: Response) {
  const parsed = barbershopDetailsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const exists = await prisma.barbershop.findUnique({ where: { id: req.params.id } })
  if (!exists) {
    res.status(404).json({ error: 'Barbearia não encontrada' })
    return
  }

  const slugInUse = await prisma.barbershop.findFirst({
    where: {
      slug: parsed.data.slug,
      id: { not: req.params.id },
    },
    select: { id: true },
  })

  if (slugInUse) {
    res.status(409).json({ error: 'Este slug já está em uso' })
    return
  }

  const barbershop = await prisma.barbershop.update({
    where: { id: req.params.id },
    data: {
      name: parsed.data.name.trim(),
      slug: parsed.data.slug.trim(),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      suspended: true,
      suspendedReason: true,
      subscriptionPlan: true,
      subscriptionEndsAt: true,
      createdAt: true,
      _count: { select: { barbers: true, bookings: true, customers: true } },
    },
  })

  res.json(barbershop)
}

const suspendSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().optional(),
})

const createBarbershopSchema = z.object({
  barbershopName: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  plan: z.enum(['FREE', 'BASIC', 'PRO']).optional().default('FREE'),
})

export async function createBarbershop(req: Request, res: Response) {
  const parsed = createBarbershopSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.barbershop.findUnique({ where: { slug: parsed.data.slug } })
  if (exists) { res.status(409).json({ error: 'Este slug já está em uso' }); return }

  const hashed = await bcrypt.hash(parsed.data.adminPassword, 10)
  const barbershop = await prisma.barbershop.create({
    data: {
      name: parsed.data.barbershopName,
      slug: parsed.data.slug,
      subscriptionPlan: parsed.data.plan,
      users: {
        create: { name: parsed.data.adminName, email: parsed.data.adminEmail, password: hashed, role: 'OWNER' },
      },
    },
    select: {
      id: true, name: true, slug: true, subscriptionPlan: true,
      _count: { select: { barbers: true, bookings: true, customers: true } },
    },
  })
  res.status(201).json(barbershop)
}

export async function deleteBarbershop(req: Request, res: Response) {
  const exists = await prisma.barbershop.findUnique({ where: { id: req.params.id } })
  if (!exists) { res.status(404).json({ error: 'Barbearia não encontrada' }); return }

  await prisma.barbershop.delete({ where: { id: req.params.id } })
  res.status(204).send()
}

export async function suspendBarbershop(req: Request, res: Response) {
  const parsed = suspendSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.barbershop.findUnique({ where: { id: req.params.id } })
  if (!exists) { res.status(404).json({ error: 'Barbearia não encontrada' }); return }

  const barbershop = await prisma.barbershop.update({
    where: { id: req.params.id },
    data: {
      suspended: parsed.data.suspended,
      suspendedReason: parsed.data.suspended ? (parsed.data.reason ?? null) : null,
    },
    select: { id: true, name: true, suspended: true, suspendedReason: true },
  })

  res.json(barbershop)
}

export async function getBarbershop(req: Request, res: Response) {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      subscriptionPlan: true,
      subscriptionEndsAt: true,
      createdAt: true,
      _count: { select: { barbers: true, bookings: true, customers: true } },
    },
  })
  if (!barbershop) { res.status(404).json({ error: 'Não encontrado' }); return }

  const plan = barbershop.subscriptionPlan as SubscriptionPlan
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE

  res.json({ ...barbershop, limits })
}

export async function createSupportSession(req: Request, res: Response) {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      slug: true,
      name: true,
      users: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, email: true, role: true },
        take: 1,
      },
    },
  })

  if (!barbershop) {
    res.status(404).json({ error: 'Barbearia não encontrada' })
    return
  }

  const user = barbershop.users[0]
  if (!user) {
    res.status(404).json({ error: 'Esta barbearia não tem utilizador administrador associado' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, barbershopId: barbershop.id, role: 'SUPPORT' },
    process.env.JWT_SECRET!,
    { expiresIn: '2h' } as jwt.SignOptions
  )

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'SUPPORT',
      barbershopId: barbershop.id,
    },
    barbershop: {
      id: barbershop.id,
      slug: barbershop.slug,
      name: barbershop.name,
    },
  })
}
