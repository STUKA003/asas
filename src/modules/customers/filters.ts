export function buildCustomerListWhere(params: {
  barbershopId: string
  q?: unknown
  planId?: unknown
  hasPlan?: unknown
}) {
  const where: Record<string, unknown> = { barbershopId: params.barbershopId }

  if (params.q) {
    const query = String(params.q).trim()
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { email: { contains: query } },
        { phone: { contains: query } },
      ]
    }
  }

  if (params.planId) {
    where.planId = params.planId
  } else if (params.hasPlan === 'true') {
    where.planId = { not: null }
  } else if (params.hasPlan === 'false') {
    where.planId = null
  }

  return where
}
