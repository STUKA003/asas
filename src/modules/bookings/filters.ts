export function buildBookingListWhere(params: {
  barbershopId: string
  barberId?: unknown
  customerId?: unknown
  status?: unknown
  date?: unknown
  q?: unknown
}) {
  const where: Record<string, unknown> = { barbershopId: params.barbershopId }

  if (params.barberId) where.barberId = params.barberId
  if (params.customerId) where.customerId = params.customerId
  if (params.status) where.status = params.status

  if (params.date) {
    const d = new Date(params.date as string)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.startTime = { gte: d, lt: next }
  }

  if (params.q) {
    const query = String(params.q).trim()
    if (query) {
      where.OR = [
        { customer: { name: { contains: query } } },
        { customer: { phone: { contains: query } } },
        { barber: { name: { contains: query } } },
        { services: { some: { service: { name: { contains: query } } } } },
      ]
    }
  }

  return where
}
