import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { PLAN_LIMITS, getEffectivePlan, type SubscriptionPlan } from '../../lib/plans'

const imageSchema = z.string().refine(
  (value) => value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://'),
  'Imagem inválida',
)

const MAX_IMAGE_DATA_LENGTH = 1_500_000
const MAX_GALLERY_IMAGES = 8

function parseGalleryImages(value: string | null) {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

const updateSchema = z.object({
  name:        z.string().min(2).optional(),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  whatsapp:    z.string().optional(),
  instagram:   z.string().optional(),
  logoUrl:     imageSchema.optional().or(z.literal('')),
  heroImageUrl: imageSchema.optional().or(z.literal('')),
  heroTitle:   z.string().optional(),
  heroSubtitle:z.string().optional(),
  heroButtonText: z.string().optional(),
  aboutText:   z.string().optional(),
  galleryImages: z.array(imageSchema).max(MAX_GALLERY_IMAGES).optional(),
  promoEnabled: z.boolean().optional(),
  promoTitle: z.string().optional(),
  promoText: z.string().optional(),
  promoButtonText: z.string().optional(),
  showPlans: z.boolean().optional(),
  showProducts: z.boolean().optional(),
  planMemberDiscount: z.number().int().min(0).max(100).optional(),
  slotGranularityMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30)]).optional(),
  accentColor: z.string().optional(),
})

export async function getMyBarbershop(req: Request, res: Response) {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.auth.barbershopId },
  })
  if (!barbershop) { res.json(null); return }

  const effectivePlan = getEffectivePlan(barbershop.subscriptionPlan, barbershop.subscriptionEndsAt)
  const limits = PLAN_LIMITS[effectivePlan]

  // Monthly booking count for FREE plan display
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthlyBookings = limits.maxMonthlyBookings !== Infinity
    ? await prisma.booking.count({
        where: { barbershopId: barbershop.id, startTime: { gte: monthStart, lt: monthEnd } },
      })
    : null
  const activeBarbers = limits.maxBarbers !== Infinity
    ? await prisma.barber.count({ where: { barbershopId: barbershop.id, active: true } })
    : null
  const serializedMaxBarbers = limits.maxBarbers === Infinity ? null : limits.maxBarbers
  const serializedMaxMonthlyBookings = limits.maxMonthlyBookings === Infinity ? null : limits.maxMonthlyBookings

  const expired = barbershop.subscriptionPlan !== 'FREE'
    && barbershop.subscriptionEndsAt !== null
    && barbershop.subscriptionEndsAt < new Date()

  res.json({
    ...barbershop,
    galleryImages: parseGalleryImages(barbershop.galleryImages),
    subscription: {
      plan: effectivePlan,
      paidPlan: barbershop.subscriptionPlan,
      endsAt: barbershop.subscriptionEndsAt,
      expired,
      limits: {
        maxBarbers: serializedMaxBarbers,
        maxMonthlyBookings: serializedMaxMonthlyBookings,
        activeBarbers,
        monthlyBookings,
      },
    },
  })
}

const subscriptionSchema = z.object({
  plan: z.enum(['FREE', 'BASIC', 'PRO']),
  endsAt: z.string().datetime().optional(),
})

export async function updateSubscription(req: Request, res: Response) {
  const parsed = subscriptionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const barbershop = await prisma.barbershop.update({
    where: { id: req.auth.barbershopId },
    data: {
      subscriptionPlan: parsed.data.plan,
      subscriptionEndsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    },
  })
  res.json({ plan: barbershop.subscriptionPlan, endsAt: barbershop.subscriptionEndsAt })
}

export async function updateBarbershop(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  if (parsed.data.logoUrl && parsed.data.logoUrl.startsWith('data:image/') && parsed.data.logoUrl.length > MAX_IMAGE_DATA_LENGTH) {
    res.status(400).json({ error: 'A imagem do logo é demasiado grande. Escolha uma imagem mais leve.' })
    return
  }
  if (parsed.data.heroImageUrl && parsed.data.heroImageUrl.startsWith('data:image/') && parsed.data.heroImageUrl.length > MAX_IMAGE_DATA_LENGTH) {
    res.status(400).json({ error: 'A imagem principal é demasiado grande. Escolha uma imagem mais leve.' })
    return
  }
  if (parsed.data.galleryImages?.some((image) => image.startsWith('data:image/') && image.length > MAX_IMAGE_DATA_LENGTH)) {
    res.status(400).json({ error: 'Uma das imagens da galeria é demasiado grande. Escolha imagens mais leves.' })
    return
  }

  const {
    logoUrl,
    heroImageUrl,
    galleryImages,
    ...rest
  } = parsed.data

  const barbershop = await prisma.barbershop.update({
    where: { id: req.auth.barbershopId },
    data: {
      ...rest,
      ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}),
      ...(heroImageUrl !== undefined ? { heroImageUrl: heroImageUrl || null } : {}),
      ...(galleryImages !== undefined ? { galleryImages: JSON.stringify(galleryImages) } : {}),
    },
  })
  res.json({ ...barbershop, galleryImages: parseGalleryImages(barbershop.galleryImages) })
}
