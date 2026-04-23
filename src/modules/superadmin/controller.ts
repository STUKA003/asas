import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { PLAN_LIMITS, type SubscriptionPlan } from '../../lib/plans'
import { generateAvailableSlug, normalizeSlug } from '../../lib/slug'
import { issueEmailVerification } from '../../lib/auth-tokens'

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
  const q = String(req.query.q ?? '').trim()
  const verification = String(req.query.verification ?? 'all')
  const health = String(req.query.health ?? 'all')

  const barbershops = await prisma.barbershop.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
              {
                users: {
                  some: {
                    OR: [
                      { email: { contains: q, mode: 'insensitive' } },
                      { name: { contains: q, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
      ...(verification === 'pending'
        ? {
            users: {
              some: {
                role: 'OWNER',
                emailVerifiedAt: null,
              },
            },
          }
        : verification === 'verified'
          ? {
              users: {
                some: {
                  role: 'OWNER',
                  emailVerifiedAt: { not: null },
                },
              },
            }
          : {}),
      ...(health === 'suspended'
        ? { suspended: true }
        : health === 'unverified'
          ? {
              users: {
                some: {
                  role: 'OWNER',
                  emailVerifiedAt: null,
                },
              },
            }
          : health === 'no-plan'
            ? { subscriptionPlan: 'FREE' }
            : health === 'active'
              ? {
                  suspended: false,
                  subscriptionPlan: { not: 'FREE' },
                  OR: [
                    { subscriptionEndsAt: null },
                    { subscriptionEndsAt: { gte: new Date() } },
                  ],
                }
              : {}),
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
      stripeSubscriptionStatus: true,
      _count: { select: { barbers: true, bookings: true, customers: true } },
      users: {
        where: { role: 'OWNER' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const ids = barbershops.map((shop) => shop.id)
  const [recentEvents, eventCounts] = await Promise.all([
    ids.length
      ? prisma.authSecurityEvent.findMany({
          where: { barbershopId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            reason: true,
            email: true,
            createdAt: true,
            barbershopId: true,
          },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.authSecurityEvent.groupBy({
          by: ['barbershopId', 'type'],
          where: { barbershopId: { in: ids } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ])

  const eventsByBarbershop = new Map<string, typeof recentEvents>()
  for (const event of recentEvents) {
    if (!event.barbershopId) continue
    const current = eventsByBarbershop.get(event.barbershopId) ?? []
    if (current.length < 8) current.push(event)
    eventsByBarbershop.set(event.barbershopId, current)
  }

  const countsByBarbershop = new Map<
    string,
    { successLogins: number; failedLogins: number; passwordResetRequests: number }
  >()
  for (const row of eventCounts) {
    if (!row.barbershopId) continue
    const current = countsByBarbershop.get(row.barbershopId) ?? {
      successLogins: 0,
      failedLogins: 0,
      passwordResetRequests: 0,
    }
    if (row.type === 'LOGIN_SUCCESS') current.successLogins = row._count._all
    if (row.type === 'LOGIN_FAILURE') current.failedLogins = row._count._all
    if (row.type === 'PASSWORD_RESET_REQUEST') current.passwordResetRequests = row._count._all
    countsByBarbershop.set(row.barbershopId, current)
  }

  res.json(
    barbershops.map((shop) => {
      const owner = shop.users[0] ?? null
      const expiresAt = shop.subscriptionEndsAt ? new Date(shop.subscriptionEndsAt) : null
      const subscriptionActive =
        shop.subscriptionPlan !== 'FREE' &&
        !shop.suspended &&
        (!expiresAt || expiresAt >= new Date())

      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        phone: shop.phone,
        suspended: shop.suspended,
        suspendedReason: shop.suspendedReason,
        subscriptionPlan: shop.subscriptionPlan,
        subscriptionEndsAt: shop.subscriptionEndsAt,
        stripeSubscriptionStatus: shop.stripeSubscriptionStatus,
        createdAt: shop.createdAt,
        owner,
        health: {
          subscriptionActive,
          suspended: shop.suspended,
          unverifiedEmail: !owner?.emailVerifiedAt,
          noPlan: shop.subscriptionPlan === 'FREE',
        },
        security: {
          ...(countsByBarbershop.get(shop.id) ?? {
            successLogins: 0,
            failedLogins: 0,
            passwordResetRequests: 0,
          }),
          latestLoginAt:
            eventsByBarbershop
              .get(shop.id)
              ?.find((event: (typeof recentEvents)[number]) => event.type === 'LOGIN_SUCCESS')
              ?.createdAt ?? null,
          latestFailedLoginAt:
            eventsByBarbershop
              .get(shop.id)
              ?.find((event: (typeof recentEvents)[number]) => event.type === 'LOGIN_FAILURE')
              ?.createdAt ?? null,
          latestPasswordResetAt:
            eventsByBarbershop
              .get(shop.id)
              ?.find((event: (typeof recentEvents)[number]) => event.type === 'PASSWORD_RESET_REQUEST')
              ?.createdAt ?? null,
          recentEvents: eventsByBarbershop.get(shop.id) ?? [],
        },
        _count: shop._count,
      }
    })
  )
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

const ownerPasswordSchema = z.object({
  password: z.string().min(6, 'A password tem de ter pelo menos 6 caracteres'),
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
      slug: normalizeSlug(parsed.data.slug),
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
      slug: normalizeSlug(parsed.data.slug),
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

  const requestedSlug = normalizeSlug(parsed.data.slug)
  if (requestedSlug.length < 2) {
    res.status(400).json({ error: { fieldErrors: { slug: ['O slug tem de ter pelo menos 2 caracteres'] } } })
    return
  }
  const slug = await generateAvailableSlug(requestedSlug)

  const hashed = await bcrypt.hash(parsed.data.adminPassword, 10)
  const barbershop = await prisma.barbershop.create({
    data: {
      name: parsed.data.barbershopName,
      slug,
      subscriptionPlan: parsed.data.plan,
      users: {
        create: {
          name: parsed.data.adminName,
          email: parsed.data.adminEmail,
          password: hashed,
          role: 'OWNER',
          emailVerifiedAt: new Date(),
        },
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

export async function verifyOwnerEmail(req: Request, res: Response) {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      users: {
        where: { role: 'OWNER' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { id: true, emailVerifiedAt: true },
      },
    },
  })

  const owner = barbershop?.users[0]
  if (!barbershop || !owner) {
    res.status(404).json({ error: 'Barbearia ou utilizador administrador não encontrado' })
    return
  }

  const updated = await prisma.user.update({
    where: { id: owner.id },
    data: { emailVerifiedAt: new Date() },
    select: { id: true, emailVerifiedAt: true },
  })

  res.json({ success: true, user: updated })
}

export async function updateOwnerPassword(req: Request, res: Response) {
  const parsed = ownerPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      users: {
        where: { role: 'OWNER' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { id: true },
      },
    },
  })

  const owner = barbershop?.users[0]
  if (!barbershop || !owner) {
    res.status(404).json({ error: 'Barbearia ou utilizador administrador não encontrado' })
    return
  }

  const password = await bcrypt.hash(parsed.data.password, 10)
  await prisma.user.update({
    where: { id: owner.id },
    data: { password },
  })

  res.json({ success: true })
}

export async function resendOwnerVerification(req: Request, res: Response) {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      slug: true,
      users: {
        where: { role: 'OWNER' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: {
          id: true,
          email: true,
          name: true,
          emailVerifiedAt: true,
        },
      },
    },
  })

  const owner = barbershop?.users[0]
  if (!barbershop || !owner) {
    res.status(404).json({ error: 'Barbearia ou utilizador administrador não encontrado' })
    return
  }

  if (owner.emailVerifiedAt) {
    res.json({ success: true, message: 'O email desta conta já está confirmado.' })
    return
  }

  await issueEmailVerification(owner, barbershop.slug)
  res.json({ success: true, message: 'Email de confirmação reenviado.' })
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
        select: { id: true, name: true, email: true, avatar: true, role: true },
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
      avatar: user.avatar,
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
