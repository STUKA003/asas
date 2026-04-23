import { prisma } from '../../lib/prisma'
import { validateSlot } from '../../utils/availability'
import { getPlanLimits, getEffectivePlan } from '../../lib/plans'
import { lockBarberForUpdate, lockProductsForUpdate } from '../../lib/transaction-locks'

interface CreateBookingInput {
  attendeeName?: string
  barbershopId: string
  barberId: string
  customerId: string
  serviceIds: string[]
  extraIds?: string[]
  productIds?: string[]
  startTime: Date
  notes?: string
}

export async function createBooking(input: CreateBookingInput) {
  const { attendeeName, barbershopId, barberId, customerId, serviceIds, extraIds = [], productIds = [], startTime, notes } = input

  const [barber, customer, services, extras, products] = await Promise.all([
    prisma.barber.findFirst({ where: { id: barberId, barbershopId, active: true } }),
    prisma.customer.findFirst({
      where: { id: customerId, barbershopId },
      include: {
        plan: {
          include: {
            planServices: {
              select: { serviceId: true },
            },
          },
        },
      },
    }),
    prisma.service.findMany({ where: { id: { in: serviceIds }, barbershopId, active: true } }),
    prisma.extra.findMany({ where: { id: { in: extraIds }, barbershopId, active: true } }),
    prisma.product.findMany({ where: { id: { in: productIds }, barbershopId, active: true } }),
  ])

  // Check subscription plan limits
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
    select: { subscriptionPlan: true, subscriptionEndsAt: true, planMemberDiscount: true },
  })
  const effectivePlan = getEffectivePlan(barbershop?.subscriptionPlan ?? 'FREE', barbershop?.subscriptionEndsAt ?? null)
  const limits = getPlanLimits(effectivePlan)

  if (limits.maxMonthlyBookings !== Infinity) {
    const monthStart = new Date(startTime.getFullYear(), startTime.getMonth(), 1)
    const monthEnd   = new Date(startTime.getFullYear(), startTime.getMonth() + 1, 1)
    const count = await prisma.booking.count({
      where: {
        barbershopId,
        status: { notIn: ['CANCELLED'] },
        startTime: { gte: monthStart, lt: monthEnd },
      },
    })
    if (count >= limits.maxMonthlyBookings) {
      throw new Error(
        `O teu plano ${limits.label} permite no máximo ${limits.maxMonthlyBookings} agendamentos por mês. Faz upgrade para continuar a aceitar marcações.`
      )
    }
  }

  if (effectivePlan === 'FREE') {
    if (extraIds.length > 0) throw new Error('Extras não estão disponíveis no plano Grátis.')
    if (productIds.length > 0) throw new Error('Produtos não estão disponíveis no plano Grátis.')
  }

  if (!barber) throw new Error('Barber not found or inactive')
  if (!customer) throw new Error('Customer not found')
  if (services.length !== serviceIds.length) throw new Error('One or more services not found')
  if (extras.length !== extraIds.length) throw new Error('One or more extras not found')
  if (products.length !== productIds.length) throw new Error('One or more products not found')

  const planServiceIds = new Set(
    customer.plan?.planServices.map((item) => item.serviceId) ?? []
  )

  if (customer.plan) {
    const allowedDays = customer.plan.allowedDays
      .split(',')
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)

    if (!allowedDays.includes(startTime.getDay())) {
      throw new Error('Este plano nao permite marcacoes nesse dia da semana.')
    }

    const activePlanBooking = await prisma.booking.findFirst({
      where: { customerId: customer.id, barbershopId, status: { in: ['PENDING', 'CONFIRMED'] } },
      select: { id: true },
    })
    if (activePlanBooking) {
      throw new Error('Este cliente tem uma marcacao ativa no plano. So pode voltar a marcar depois de concluir o atendimento atual.')
    }
  }

  const totalDuration =
    services.reduce((sum, s) => sum + s.duration, 0) +
    extras.reduce((sum, e) => sum + e.duration, 0)

  // Desconto para membros do plano (em serviços fora do plano, extras e produtos)
  const discountPct = customer.plan ? (barbershop?.planMemberDiscount ?? 0) : 0
  const applyDiscount = (price: number) => price * (1 - discountPct / 100)

  // Serviços cobertos pelo plano têm preço 0; restantes têm desconto de membro se aplicável
  const totalPrice =
    services.reduce((sum, s) => sum + (planServiceIds.has(s.id) ? 0 : applyDiscount(Number(s.price))), 0) +
    extras.reduce((sum, e) => sum + applyDiscount(Number(e.price)), 0) +
    products.reduce((sum, p) => sum + applyDiscount(Number(p.price)), 0)

  const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000)

  const booking = await prisma.$transaction(async (tx) => {
    await lockBarberForUpdate(tx, barberId)
    await lockProductsForUpdate(tx, products.map((product) => product.id))

    const slotError = await validateSlot(barberId, barbershopId, startTime, endTime, undefined, tx)
    if (slotError) throw new Error(slotError)

    for (const product of products) {
      const updated = await tx.product.updateMany({
        where: { id: product.id, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      })

      if (updated.count === 0) {
        throw new Error(`Product out of stock: ${product.name}`)
      }
    }

    const createdBooking = await tx.booking.create({
      data: {
        startTime,
        endTime,
        attendeeName: attendeeName?.trim() || undefined,
        notes,
        totalPrice,
        totalDuration,
        barbershopId,
        barberId,
        customerId,
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            price: planServiceIds.has(s.id) ? 0 : applyDiscount(Number(s.price)),
            duration: s.duration,
          })),
        },
        extras: {
          create: extras.map((e) => ({
            extraId: e.id,
            price: applyDiscount(Number(e.price)),
            duration: e.duration,
          })),
        },
        products: {
          create: products.map((p) => ({
            productId: p.id,
            price: applyDiscount(Number(p.price)),
          })),
        },
      },
      include: {
        barber: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        services: { include: { service: { select: { id: true, name: true } } } },
        extras: { include: { extra: { select: { id: true, name: true } } } },
        products: { include: { product: { select: { id: true, name: true } } } },
      },
    })

    return createdBooking
  })

  return booking
}
