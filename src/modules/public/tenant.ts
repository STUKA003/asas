import { prisma } from '../../lib/prisma'
import { getEffectivePlan } from '../../lib/plans'

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
  responseBody: string | null
  id: string | null
}

const publicTenantCache = new Map<string, CachedPublicShop>()
const publicTenantSlugById = new Map<string, string>()
const publicTenantInflight = new Map<string, Promise<PublicShop | null>>()

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

function buildPublicBarbershopResponse(shop: PublicShop) {
  const { subscriptionPlan, subscriptionEndsAt, ...publicShop } = shop

  return {
    ...publicShop,
    plan: getEffectivePlan(subscriptionPlan, subscriptionEndsAt),
  }
}

function cachePublicTenant(slug: string, shop: PublicShop | null, now: number) {
  const normalizedSlug = slug.trim().toLowerCase()
  const responseBody = shop ? JSON.stringify(buildPublicBarbershopResponse(shop)) : null
  publicTenantCache.set(normalizedSlug, {
    expiresAt: now + PUBLIC_TENANT_CACHE_TTL_MS,
    shop,
    responseBody,
    id: shop?.id ?? null,
  })

  if (shop?.id) {
    publicTenantSlugById.set(shop.id, normalizedSlug)
  }
}

export function invalidatePublicTenantCache(input: { slug?: string | null; id?: string | null }) {
  const normalizedSlug = input.slug?.trim().toLowerCase()
  const slugFromId = input.id ? publicTenantSlugById.get(input.id) : undefined
  const slugs = new Set([normalizedSlug, slugFromId].filter((value): value is string => Boolean(value)))

  for (const slug of slugs) {
    const cached = publicTenantCache.get(slug)
    if (cached?.id) {
      publicTenantSlugById.delete(cached.id)
    }
    publicTenantCache.delete(slug)
    publicTenantInflight.delete(slug)
  }

  if (input.id) {
    publicTenantSlugById.delete(input.id)
  }
}

export function getCachedPublicBarbershopResponse(slug: string) {
  const cached = publicTenantCache.get(slug.trim().toLowerCase())
  if (!cached || cached.expiresAt <= Date.now() || !cached.responseBody) {
    return null
  }

  return cached.responseBody
}

export async function resolvePublicTenant(slug: string): Promise<PublicShop | null> {
  const normalizedSlug = slug.trim().toLowerCase()
  const now = Date.now()
  const cached = publicTenantCache.get(normalizedSlug)
  if (cached && cached.expiresAt > now) {
    return cached.shop
  }

  const inflight = publicTenantInflight.get(normalizedSlug)
  if (inflight) {
    return inflight
  }

  const loadPromise = prisma.barbershop.findUnique({
    where: { slug: normalizedSlug },
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
  }).then((shop) => {
    const normalized = shop ? normalizePublicShop(shop as RawPublicShop) : null
    cachePublicTenant(normalizedSlug, normalized, now)
    return normalized
  }).finally(() => {
    publicTenantInflight.delete(normalizedSlug)
  })

  publicTenantInflight.set(normalizedSlug, loadPromise)
  return loadPromise
}
