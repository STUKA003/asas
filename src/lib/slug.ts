import { prisma } from './prisma'

export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40)
}

export async function generateAvailableSlug(rawValue: string, excludeBarbershopId?: string) {
  const normalized = normalizeSlug(rawValue)
  const base = normalized.replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

  if (base.length < 2) {
    return base
  }

  const current = await prisma.barbershop.findFirst({
    where: {
      slug: base,
      ...(excludeBarbershopId ? { id: { not: excludeBarbershopId } } : {}),
    },
    select: { id: true },
  })

  if (!current) {
    return base
  }

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const suffixLabel = `-${suffix}`
    const candidate = `${base.slice(0, Math.max(2, 40 - suffixLabel.length))}${suffixLabel}`
    const conflict = await prisma.barbershop.findFirst({
      where: {
        slug: candidate,
        ...(excludeBarbershopId ? { id: { not: excludeBarbershopId } } : {}),
      },
      select: { id: true },
    })

    if (!conflict) {
      return candidate
    }
  }

  return base
}
