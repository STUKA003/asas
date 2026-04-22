import { Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { getPlanLimits, getEffectivePlan } from '../../lib/plans'

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
})

const updateSchema = createSchema.partial().extend({
  active: z.boolean().optional(),
})

function serializeBarber<T extends { password?: string | null }>(barber: T) {
  const { password, ...rest } = barber
  return { ...rest, hasAccess: !!password }
}

export async function list(req: Request, res: Response) {
  const barbers = await prisma.barber.findMany({
    where: { barbershopId: req.auth.barbershopId },
    orderBy: { name: 'asc' },
  })
  res.json(barbers.map(serializeBarber))
}

export async function get(req: Request, res: Response) {
  const barber = await prisma.barber.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
    include: { workingHours: true },
  })
  if (!barber) { res.status(404).json({ error: 'Not found' }); return }
  res.json(serializeBarber(barber))
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.auth.barbershopId },
    select: { subscriptionPlan: true, subscriptionEndsAt: true },
  })
  const effectivePlan = getEffectivePlan(barbershop?.subscriptionPlan ?? 'FREE', barbershop?.subscriptionEndsAt ?? null)
  const limits = getPlanLimits(effectivePlan)

  if (limits.maxBarbers !== Infinity) {
    const count = await prisma.barber.count({
      where: { barbershopId: req.auth.barbershopId, active: true },
    })
    if (count >= limits.maxBarbers) {
      res.status(403).json({
        error: `O teu plano ${limits.label} permite no máximo ${limits.maxBarbers} barbeiro${limits.maxBarbers !== 1 ? 's' : ''} ativo${limits.maxBarbers !== 1 ? 's' : ''}. Faz upgrade para adicionar mais.`,
        code: 'PLAN_LIMIT_BARBERS',
      })
      return
    }
  }

  const barber = await prisma.barber.create({
    data: { ...parsed.data, barbershopId: req.auth.barbershopId },
  })
  res.status(201).json(serializeBarber(barber))
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.barber.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  // Se está a reactivar um barbeiro inativo, verificar o limite do plano
  if (parsed.data.active === true && !exists.active) {
    const barbershop = await prisma.barbershop.findUnique({
      where: { id: req.auth.barbershopId },
      select: { subscriptionPlan: true, subscriptionEndsAt: true },
    })
    const effectivePlan = getEffectivePlan(barbershop?.subscriptionPlan ?? 'FREE', barbershop?.subscriptionEndsAt ?? null)
    const limits = getPlanLimits(effectivePlan)

    if (limits.maxBarbers !== Infinity) {
      const count = await prisma.barber.count({
        where: { barbershopId: req.auth.barbershopId, active: true },
      })
      if (count >= limits.maxBarbers) {
        res.status(403).json({
          error: `O teu plano ${limits.label} permite no máximo ${limits.maxBarbers} barbeiro${limits.maxBarbers !== 1 ? 's' : ''} ativo${limits.maxBarbers !== 1 ? 's' : ''}. Faz upgrade para adicionar mais.`,
          code: 'PLAN_LIMIT_BARBERS',
        })
        return
      }
    }
  }

  const barber = await prisma.barber.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(serializeBarber(barber))
}

export async function setPassword(req: Request, res: Response) {
  const schema = z.object({ password: z.string().min(6).nullable() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const exists = await prisma.barber.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  const hashed = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : null
  await prisma.barber.update({ where: { id: req.params.id }, data: { password: hashed } })

  res.json({ hasAccess: !!hashed })
}

export async function remove(req: Request, res: Response) {
  const exists = await prisma.barber.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  await prisma.barber.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
