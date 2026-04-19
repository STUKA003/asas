import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { getEffectivePlan } from '../../lib/plans'

const imageSchema = z.string().refine(
  (value) => value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://'),
  'Imagem inválida',
)

const MAX_IMAGE_DATA_LENGTH = 1_500_000

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: imageSchema.optional().or(z.literal('')),
  price: z.number().positive(),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().optional(),
})

export async function list(req: Request, res: Response) {
  const items = await prisma.product.findMany({
    where: { barbershopId: req.auth.barbershopId },
    orderBy: { name: 'asc' },
  })
  res.json(items)
}

export async function get(req: Request, res: Response) {
  const item = await prisma.product.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const shop = await prisma.barbershop.findUnique({
    where: { id: req.auth.barbershopId },
    select: { subscriptionPlan: true, subscriptionEndsAt: true },
  })
  if (getEffectivePlan(shop?.subscriptionPlan ?? 'FREE', shop?.subscriptionEndsAt ?? null) === 'FREE') {
    res.status(403).json({ error: 'Plano BASIC ou superior necessário para criar produtos.' })
    return
  }

  if (parsed.data.imageUrl && parsed.data.imageUrl.startsWith('data:image/') && parsed.data.imageUrl.length > MAX_IMAGE_DATA_LENGTH) {
    res.status(400).json({ error: 'A imagem é demasiado grande. Escolha uma imagem mais leve.' })
    return
  }

  const item = await prisma.product.create({
    data: {
      ...parsed.data,
      imageUrl: parsed.data.imageUrl || undefined,
      barbershopId: req.auth.barbershopId,
    },
  })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const parsed = schema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  if (parsed.data.imageUrl && parsed.data.imageUrl.startsWith('data:image/') && parsed.data.imageUrl.length > MAX_IMAGE_DATA_LENGTH) {
    res.status(400).json({ error: 'A imagem é demasiado grande. Escolha uma imagem mais leve.' })
    return
  }

  const exists = await prisma.product.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  const item = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl || null } : {}),
    },
  })
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const exists = await prisma.product.findFirst({
    where: { id: req.params.id, barbershopId: req.auth.barbershopId },
  })
  if (!exists) { res.status(404).json({ error: 'Not found' }); return }

  await prisma.product.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
