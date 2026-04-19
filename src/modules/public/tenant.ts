import { prisma } from '../../lib/prisma'

export async function resolvePublicTenant(slug: string) {
  return prisma.barbershop.findUnique({
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
}

export function normalizePublicShop<T extends { galleryImages: string | null }>(shop: T) {
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
