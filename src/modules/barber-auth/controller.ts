import { Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

const loginSchema = z.object({
  slug:     z.string(),
  email:    z.string().email(),
  password: z.string().min(1),
})

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { slug, email, password } = parsed.data

  const shop = await prisma.barbershop.findUnique({ where: { slug }, select: { id: true, suspended: true } })
  if (!shop) { res.status(401).json({ error: 'Barbearia não encontrada.' }); return }
  if (shop.suspended) { res.status(403).json({ error: 'Conta suspensa.', code: 'SUSPENDED' }); return }

  const barber = await prisma.barber.findFirst({
    where: { email, barbershopId: shop.id, active: true },
      select: {
        id: true, name: true, email: true, avatar: true, password: true, barbershopId: true,
        barbershop: { select: { slug: true, name: true, accentColor: true, logoUrl: true, subscriptionPlan: true, subscriptionEndsAt: true, slotGranularityMinutes: true } },
      },
  })

  if (!barber || !barber.password) {
    res.status(401).json({ error: 'Credenciais inválidas ou acesso não activado.' })
    return
  }

  const valid = await bcrypt.compare(password, barber.password)
  if (!valid) { res.status(401).json({ error: 'Credenciais inválidas.' }); return }

  const token = jwt.sign(
    { barberId: barber.id, barbershopId: barber.barbershopId, type: 'barber' },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' } as object
  )

  res.json({
    token,
    barber: {
      id: barber.id, name: barber.name, email: barber.email, avatar: barber.avatar,
      barbershopId: barber.barbershopId,
      barbershop: barber.barbershop,
    },
  })
}

export async function me(req: Request, res: Response) {
  const barber = await prisma.barber.findUnique({
    where: { id: req.barberAuth.barberId },
    select: { id: true, name: true, email: true, avatar: true, barbershopId: true },
  })
  if (!barber) { res.status(404).json({ error: 'Not found' }); return }

  const shop = await prisma.barbershop.findUnique({
    where: { id: barber.barbershopId },
    select: { name: true, slug: true, logoUrl: true, accentColor: true, subscriptionPlan: true, subscriptionEndsAt: true, slotGranularityMinutes: true },
  })

  res.json({ ...barber, barbershop: shop })
}
