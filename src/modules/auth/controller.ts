import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'

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

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { barbershopName, slug, name, email, password } = parsed.data

  const exists = await prisma.barbershop.findUnique({ where: { slug } })
  if (exists) {
    res.status(409).json({ error: 'Slug already taken' })
    return
  }

  const hashed = await bcrypt.hash(password, 10)

  const barbershop = await prisma.barbershop.create({
    data: {
      name: barbershopName,
      slug,
      users: {
        create: { name, email, password: hashed, role: 'OWNER' },
      },
    },
    include: { users: { select: { id: true, name: true, email: true, role: true } } },
  })

  const user = barbershop.users[0]
  const token = jwt.sign(
    { userId: user.id, barbershopId: barbershop.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  )

  res.status(201).json({ token, user, barbershop: { id: barbershop.id, name: barbershop.name, slug: barbershop.slug } })
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { email, password, slug } = parsed.data

  const barbershop = await prisma.barbershop.findUnique({ where: { slug } })
  if (!barbershop) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { email_barbershopId: { email, barbershopId: barbershop.id } },
  })

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, barbershopId: barbershop.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  )

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: { id: true, name: true, email: true, role: true, barbershopId: true },
  })
  res.json(user)
}
