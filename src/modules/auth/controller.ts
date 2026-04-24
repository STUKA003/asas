import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { generateAvailableSlug, normalizeSlug } from '../../lib/slug'
import { consumeAuthToken, issueEmailVerification, issuePasswordReset } from '../../lib/auth-tokens'

const registerSchema = z.object({
  barbershopName: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  slug: z.string(),
})

const tokenSchema = z.object({
  token: z.string().min(20),
})

const resendSchema = z.object({
  email: z.string().email(),
  slug: z.string().min(1),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  slug: z.string().min(1),
})

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
})

function getRequestMeta(req: Request) {
  return {
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  }
}

async function logAuthSecurityEvent(input: {
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'PASSWORD_RESET_REQUEST'
  reason?: string
  email?: string
  slug?: string
  userId?: string
  barbershopId?: string
  ipAddress?: string | null
  userAgent?: string | null
}) {
  await prisma.authSecurityEvent.create({
    data: {
      type: input.type,
      reason: input.reason,
      email: input.email,
      slug: input.slug,
      userId: input.userId,
      barbershopId: input.barbershopId,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  })
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { barbershopName, name, email, password } = parsed.data
  const requestedSlug = normalizeSlug(parsed.data.slug)
  if (requestedSlug.length < 2) {
    res.status(400).json({ error: { fieldErrors: { slug: ['Mínimo 2 caracteres'] } } })
    return
  }
  const slug = await generateAvailableSlug(requestedSlug)

  const hashed = await bcrypt.hash(password, 10)

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  const barbershop = await prisma.barbershop.create({
    data: {
      name: barbershopName,
      slug,
      subscriptionPlan: 'BASIC',
      subscriptionEndsAt: trialEndsAt,
      users: {
        create: { name, email, password: hashed, role: 'OWNER' },
      },
    },
    include: { users: { select: { id: true, name: true, email: true, avatar: true, role: true } } },
  })

  const user = barbershop.users[0]

  try {
    await issueEmailVerification(user, barbershop.slug)
  } catch (error) {
    await prisma.barbershop.delete({ where: { id: barbershop.id } })
    const message = error instanceof Error ? error.message : 'Unable to send verification email'
    res.status(503).json({ error: message })
    return
  }

  res.status(201).json({
    requiresEmailVerification: true,
    email: user.email,
    barbershop: { id: barbershop.id, name: barbershop.name, slug: barbershop.slug },
    message: 'Conta criada. Confirma o teu email para entrares no painel.',
  })
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { email, password, slug } = parsed.data
  const requestMeta = getRequestMeta(req)

  const barbershop = await prisma.barbershop.findUnique({ where: { slug } })
  if (!barbershop) {
    await logAuthSecurityEvent({
      type: 'LOGIN_FAILURE',
      reason: 'SHOP_NOT_FOUND',
      email,
      slug,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    })
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { email_barbershopId: { email, barbershopId: barbershop.id } },
  })

  if (!user || !(await bcrypt.compare(password, user.password))) {
    await logAuthSecurityEvent({
      type: 'LOGIN_FAILURE',
      reason: 'INVALID_CREDENTIALS',
      email,
      slug,
      barbershopId: barbershop.id,
      userId: user?.id,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    })
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  if (!user.emailVerifiedAt) {
    await logAuthSecurityEvent({
      type: 'LOGIN_FAILURE',
      reason: 'EMAIL_NOT_VERIFIED',
      email,
      slug,
      barbershopId: barbershop.id,
      userId: user.id,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    })
    res.status(403).json({
      error: 'Email not verified',
      message: 'Confirma o teu email antes de entrar.',
    })
    return
  }

  const token = jwt.sign(
    { userId: user.id, barbershopId: barbershop.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  )

  await logAuthSecurityEvent({
    type: 'LOGIN_SUCCESS',
    email,
    slug,
    barbershopId: barbershop.id,
    userId: user.id,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent,
  })

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, barbershopId: user.barbershopId } })
}

export async function verifyEmail(req: Request, res: Response) {
  const parsed = tokenSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const record = await consumeAuthToken(parsed.data.token, 'EMAIL_VERIFICATION')
  if (!record) {
    res.status(400).json({ error: 'Invalid or expired verification token' })
    return
  }

  await prisma.user.update({
    where: { id: record.user.id },
    data: { emailVerifiedAt: new Date() },
  })

  res.json({ success: true, message: 'Email confirmado. Já podes entrar.' })
}

export async function resendVerificationEmail(req: Request, res: Response) {
  const parsed = resendSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const shop = await prisma.barbershop.findUnique({
    where: { slug: parsed.data.slug },
    select: {
      id: true,
      slug: true,
      users: {
        where: { email: parsed.data.email },
        select: { id: true, email: true, name: true, emailVerifiedAt: true },
        take: 1,
      },
    },
  })

  const user = shop?.users[0]
  if (!shop || !user) {
    res.json({ success: true, message: 'Se a conta existir, enviámos um novo email de confirmação.' })
    return
  }

  if (user.emailVerifiedAt) {
    res.json({ success: true, message: 'Este email já está confirmado.' })
    return
  }

  await issueEmailVerification(user, shop.slug)
  res.json({ success: true, message: 'Enviámos um novo email de confirmação.' })
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const shop = await prisma.barbershop.findUnique({
    where: { slug: parsed.data.slug },
    select: {
      id: true,
      slug: true,
      users: {
        where: { email: parsed.data.email },
        select: { id: true, email: true, name: true, emailVerifiedAt: true },
        take: 1,
      },
    },
  })

  const user = shop?.users[0]
  const requestMeta = getRequestMeta(req)
  if (!shop || !user || !user.emailVerifiedAt) {
    res.json({ success: true, message: 'Se a conta existir, enviámos instruções para redefinir a password.' })
    return
  }

  await issuePasswordReset(user, shop.slug)
  await logAuthSecurityEvent({
    type: 'PASSWORD_RESET_REQUEST',
    email: user.email,
    slug: shop.slug,
    userId: user.id,
    barbershopId: shop.id,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent,
  })
  res.json({ success: true, message: 'Se a conta existir, enviámos instruções para redefinir a password.' })
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const record = await consumeAuthToken(parsed.data.token, 'PASSWORD_RESET')
  if (!record) {
    res.status(400).json({ error: 'Invalid or expired reset token' })
    return
  }

  const password = await bcrypt.hash(parsed.data.password, 10)

  await prisma.user.update({
    where: { id: record.user.id },
    data: { password },
  })

  await prisma.authToken.deleteMany({
    where: {
      userId: record.user.id,
      type: 'PASSWORD_RESET',
    },
  })

  res.json({ success: true, message: 'Password atualizada. Já podes entrar.' })
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: { id: true, name: true, email: true, avatar: true, role: true, barbershopId: true },
  })
  res.json(user)
}
