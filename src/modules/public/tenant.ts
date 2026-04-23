import { prisma } from '../../lib/prisma'

const PUBLIC_TENANT_CACHE_TTL_MS = 15_000

type RawPublicShop = {
  id: string
  name: string
  slug: string
  phone: string | null
  address: string | null
  whatsapp: string | null
  instagram: string | null
  logoUrl: string | null
  heroImageUrl: string | null
  heroTitle: string | null
  heroSubtitle: string | null
  heroButtonText: string | null
  aboutText: string | null
  galleryImages: string | null
  promoEnabled: boolean
  promoTitle: string | null
  promoText: string | null
  promoButtonText: string | null
  showPlans: boolean
  showProducts: boolean
  planMemberDiscount: number
  slotGranularityMinutes: number
  accentColor: string
  subscriptionPlan: string
  subscriptionEndsAt: Date | null
}

export type PublicShop = Omit<RawPublicShop, 'galleryImages'> & {
  galleryImages: string[]
}

type CachedPublicShop = {
  expiresAt: number
  shop: PublicShop | null
}

const publicTenantCache = new Map<string, CachedPublicShop>()

function normalizePublicShop<T extends { galleryImages: string | null }>(shop: T) {
  let galleryImages: string[] = []

  if (shop.galleryImages) {
    try {
      const parsed = JSON.parse(shop.galleryImages)
      galleryImages = Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
    } catch {
      galleryImages = []
    }
  }

  return { ...shop, galleryImages }
}

export async function resolvePublicTenant(slug: string): Promise<PublicShop | null> {
  const now = Date.now()
  const cached = publicTenantCache.get(slug)
  if (cached && cached.expiresAt > now) {
    return cached.shop
  }

  const shop = await prisma.barbershop.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      whatsapp: true,
      instagram: true,
      logoUrl: true,
      heroImageUrl: true,
      heroTitle: true,
      heroSubtitle: true,
      heroButtonText: true,
      aboutText: true,
      galleryImages: true,
      promoEnabled: true,
      promoTitle: true,
      promoText: true,
      promoButtonText: true,
      showPlans: true,
      showProducts: true,
      planMemberDiscount: true,
      slotGranularityMinutes: true,
      accentColor: true,
      subscriptionPlan: true,
      subscriptionEndsAt: true,
    },
  })

  const normalized = shop ? normalizePublicShop(shop as RawPublicShop) : null
  publicTenantCache.set(slug, {
    expiresAt: now + PUBLIC_TENANT_CACHE_TTL_MS,
    shop: normalized,
  })
  return normalized
}
