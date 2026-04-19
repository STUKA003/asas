import { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'

type ReportBooking = Awaited<ReturnType<typeof loadReportContext>>['bookings'][number]
type WorkingHour = Awaited<ReturnType<typeof loadReportContext>>['workingHours'][number]

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function startOfWeek(date: Date) {
  const start = startOfDay(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  return start
}

function endOfWeek(date: Date) {
  const end = startOfWeek(date)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function diffMinutes(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)))
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours * 60) + minutes
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function weekKey(date: Date) {
  const monday = startOfWeek(date)
  return dateKey(monday)
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function withinRange(date: Date, from: Date, to: Date) {
  return date >= from && date <= to
}

function getBookingRevenue(booking: ReportBooking) {
  return booking.status === 'COMPLETED' ? booking.totalPrice : 0
}

function getDisplayDay(date: Date) {
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

function getDisplayMonth(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

function sumPrices<T extends { price: number }>(items: T[]) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

function getWorkingMinutesForDate(date: Date, barberId: string, workingHours: WorkingHour[]) {
  const dayOfWeek = date.getDay()
  const barberSpecific = workingHours.filter((item) => item.barberId === barberId && item.dayOfWeek === dayOfWeek && item.active)
  const globalHours = workingHours.filter((item) => !item.barberId && item.dayOfWeek === dayOfWeek && item.active)
  const source = barberSpecific.length > 0 ? barberSpecific : globalHours

  return source.reduce((sum, item) => {
    const start = parseTimeToMinutes(item.startTime)
    const end = parseTimeToMinutes(item.endTime)
    return sum + Math.max(0, end - start)
  }, 0)
}

async function loadReportContext(barbershopId: string, fromDate: Date, toDate: Date) {
  const customerBookingWindowStart = addDays(fromDate, -120)

  const [bookings, barbers, workingHours, customers, customerBookings] = await Promise.all([
    prisma.booking.findMany({
      where: {
        barbershopId,
        startTime: { gte: fromDate, lte: toDate },
      },
      include: {
        barber: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, planId: true, createdAt: true } },
        services: { include: { service: { select: { id: true, name: true } } } },
        extras: { include: { extra: { select: { id: true, name: true } } } },
        products: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.barber.findMany({
      where: { barbershopId },
      select: { id: true, name: true, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.workingHours.findMany({
      where: { barbershopId },
      orderBy: [{ barberId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.customer.findMany({
      where: { barbershopId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { name: 'asc' },
    }),
    prisma.booking.findMany({
      where: {
        barbershopId,
        startTime: { gte: customerBookingWindowStart, lte: toDate },
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        customerId: true,
      },
      orderBy: { startTime: 'asc' },
    }),
  ])

  return { bookings, barbers, workingHours, customers, customerBookings }
}

export async function reports(req: Request, res: Response) {
  const { from, to } = req.query
  const barbershopId = req.auth.barbershopId

  const fromDate = from ? new Date(from as string) : startOfMonth(new Date())
  const toDate = to ? new Date(to as string) : endOfMonth(new Date())

  const { bookings, barbers, workingHours, customers, customerBookings } = await loadReportContext(barbershopId, fromDate, toDate)

  const completed = bookings.filter((booking) => booking.status === 'COMPLETED')
  const activeSchedule = bookings.filter((booking) => booking.status !== 'CANCELLED')
  const cancelledBookings = bookings.filter((booking) => booking.status === 'CANCELLED')
  const noShowBookings = bookings.filter((booking) => booking.status === 'NO_SHOW')

  const totalRevenue = completed.reduce((sum, booking) => sum + booking.totalPrice, 0)
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0
  const planBookings = completed.filter((booking) => booking.customer.planId)
  const planRevenue = planBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)

  const dayStart = startOfDay(toDate)
  const dayEnd = endOfDay(toDate)
  const weekStart = startOfWeek(toDate)
  const weekEnd = endOfWeek(toDate)
  const monthStart = startOfMonth(toDate)
  const monthEnd = endOfMonth(toDate)

  const dailyRevenue = completed
    .filter((booking) => withinRange(booking.startTime, dayStart, dayEnd))
    .reduce((sum, booking) => sum + booking.totalPrice, 0)
  const weeklyRevenue = completed
    .filter((booking) => withinRange(booking.startTime, weekStart, weekEnd))
    .reduce((sum, booking) => sum + booking.totalPrice, 0)
  const monthlyRevenue = completed
    .filter((booking) => withinRange(booking.startTime, monthStart, monthEnd))
    .reduce((sum, booking) => sum + booking.totalPrice, 0)

  const serviceMap: Record<string, { id: string; name: string; count: number; revenue: number }> = {}
  const extraMap: Record<string, { id: string; name: string; count: number; revenue: number }> = {}
  const productMap: Record<string, { id: string; name: string; count: number; revenue: number }> = {}

  activeSchedule.forEach((booking) => {
    booking.services.forEach((item) => {
      if (!serviceMap[item.serviceId]) {
        serviceMap[item.serviceId] = { id: item.serviceId, name: item.service.name, count: 0, revenue: 0 }
      }
      serviceMap[item.serviceId].count += 1
      serviceMap[item.serviceId].revenue += item.price
    })

    booking.extras.forEach((item) => {
      if (!extraMap[item.extraId]) {
        extraMap[item.extraId] = { id: item.extraId, name: item.extra.name, count: 0, revenue: 0 }
      }
      extraMap[item.extraId].count += 1
      extraMap[item.extraId].revenue += item.price
    })

    booking.products.forEach((item) => {
      if (!productMap[item.productId]) {
        productMap[item.productId] = { id: item.productId, name: item.product.name, count: 0, revenue: 0 }
      }
      productMap[item.productId].count += 1
      productMap[item.productId].revenue += item.price
    })
  })

  const topServices = Object.values(serviceMap).sort((a, b) => (b.count - a.count) || (b.revenue - a.revenue))
  const topExtras = Object.values(extraMap).sort((a, b) => (b.count - a.count) || (b.revenue - a.revenue))
  const topProducts = Object.values(productMap).sort((a, b) => (b.count - a.count) || (b.revenue - a.revenue))

  const barberMap: Record<string, {
    id: string
    name: string
    bookings: number
    revenue: number
    occupiedMinutes: number
    availableMinutes: number
    extrasCount: number
    extrasRevenue: number
    productsCount: number
    productsRevenue: number
    planCustomers: Set<string>
  }> = {}

  barbers.forEach((barber) => {
    barberMap[barber.id] = {
      id: barber.id,
      name: barber.name,
      bookings: 0,
      revenue: 0,
      occupiedMinutes: 0,
      availableMinutes: 0,
      extrasCount: 0,
      extrasRevenue: 0,
      productsCount: 0,
      productsRevenue: 0,
      planCustomers: new Set(),
    }
  })

  const dailyAgendaMap: Record<string, { day: string; occupiedMinutes: number; availableMinutes: number; bookings: number; revenue: number }> = {}

  for (let cursor = startOfDay(fromDate); cursor <= toDate; cursor = addDays(cursor, 1)) {
    const key = dateKey(cursor)
    dailyAgendaMap[key] = { day: key, occupiedMinutes: 0, availableMinutes: 0, bookings: 0, revenue: 0 }

    barbers.forEach((barber) => {
      const minutes = getWorkingMinutesForDate(cursor, barber.id, workingHours)
      barberMap[barber.id].availableMinutes += minutes
      dailyAgendaMap[key].availableMinutes += minutes
    })
  }

  activeSchedule.forEach((booking) => {
    if (!barberMap[booking.barber.id]) {
      barberMap[booking.barber.id] = {
        id: booking.barber.id,
        name: booking.barber.name,
        bookings: 0,
        revenue: 0,
        occupiedMinutes: 0,
        availableMinutes: 0,
        extrasCount: 0,
        extrasRevenue: 0,
        productsCount: 0,
        productsRevenue: 0,
        planCustomers: new Set(),
      }
    }

    const barber = barberMap[booking.barber.id]
    barber.occupiedMinutes += booking.totalDuration

    const day = dateKey(booking.startTime)
    if (!dailyAgendaMap[day]) {
      dailyAgendaMap[day] = { day, occupiedMinutes: 0, availableMinutes: 0, bookings: 0, revenue: 0 }
    }
    dailyAgendaMap[day].occupiedMinutes += booking.totalDuration
    dailyAgendaMap[day].bookings += 1
    dailyAgendaMap[day].revenue += getBookingRevenue(booking)
  })

  completed.forEach((booking) => {
    const barber = barberMap[booking.barber.id]
    barber.bookings += 1
    barber.revenue += booking.totalPrice
    if (booking.customer.planId) barber.planCustomers.add(booking.customer.id)
    barber.extrasCount += booking.extras.length
    barber.extrasRevenue += sumPrices(booking.extras)
    barber.productsCount += booking.products.length
    barber.productsRevenue += sumPrices(booking.products)
  })

  const barbersReport = Object.values(barberMap)
    .map((barber) => ({
      id: barber.id,
      name: barber.name,
      bookings: barber.bookings,
      revenue: barber.revenue,
      avgTicket: barber.bookings > 0 ? barber.revenue / barber.bookings : 0,
      occupancyRate: barber.availableMinutes > 0 ? (barber.occupiedMinutes / barber.availableMinutes) * 100 : 0,
      occupiedMinutes: barber.occupiedMinutes,
      availableMinutes: barber.availableMinutes,
      extrasCount: barber.extrasCount,
      extrasRevenue: barber.extrasRevenue,
      productsCount: barber.productsCount,
      productsRevenue: barber.productsRevenue,
      planCustomersCount: barber.planCustomers.size,
    }))
    .sort((a, b) => (b.revenue - a.revenue) || (b.bookings - a.bookings))

  const dailyAgenda = Object.values(dailyAgendaMap)
    .map((item) => ({
      ...item,
      deadMinutes: Math.max(0, item.availableMinutes - item.occupiedMinutes),
      occupancyRate: item.availableMinutes > 0 ? (item.occupiedMinutes / item.availableMinutes) * 100 : 0,
      label: getDisplayDay(new Date(`${item.day}T00:00:00`)),
    }))
    .sort((a, b) => a.day.localeCompare(b.day))

  const busiestDays = [...dailyAgenda]
    .sort((a, b) => (b.bookings - a.bookings) || (b.revenue - a.revenue))
    .slice(0, 3)

  const totalAvailableMinutes = dailyAgenda.reduce((sum, item) => sum + item.availableMinutes, 0)
  const totalOccupiedMinutes = dailyAgenda.reduce((sum, item) => sum + item.occupiedMinutes, 0)
  const totalDeadMinutes = dailyAgenda.reduce((sum, item) => sum + item.deadMinutes, 0)

  const dailySeriesMap: Record<string, number> = {}
  const weeklySeriesMap: Record<string, number> = {}
  const monthlySeriesMap: Record<string, number> = {}

  completed.forEach((booking) => {
    const day = dateKey(booking.startTime)
    const week = weekKey(booking.startTime)
    const month = monthKey(booking.startTime)
    dailySeriesMap[day] = (dailySeriesMap[day] ?? 0) + booking.totalPrice
    weeklySeriesMap[week] = (weeklySeriesMap[week] ?? 0) + booking.totalPrice
    monthlySeriesMap[month] = (monthlySeriesMap[month] ?? 0) + booking.totalPrice
  })

  const revenueByDay = Object.entries(dailySeriesMap)
    .map(([day, revenue]) => ({ day, label: getDisplayDay(new Date(`${day}T00:00:00`)), revenue }))
    .sort((a, b) => a.day.localeCompare(b.day))
  const revenueByWeek = Object.entries(weeklySeriesMap)
    .map(([week, revenue]) => ({
      week,
      label: `Semana de ${getDisplayDay(new Date(`${week}T00:00:00`))}`,
      revenue,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
  const revenueByMonth = Object.entries(monthlySeriesMap)
    .map(([month, revenue]) => ({ month, label: getDisplayMonth(month), revenue }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const bookingsByCustomer = new Map<string, { periodVisits: number; lifetimeVisits: number; lastBookingAt: Date | null; name: string }>()

  customers.forEach((customer) => {
    bookingsByCustomer.set(customer.id, {
      periodVisits: 0,
      lifetimeVisits: 0,
      lastBookingAt: null,
      name: customer.name,
    })
  })

  customerBookings.forEach((booking) => {
    if (booking.status === 'CANCELLED') return

    const customer = bookingsByCustomer.get(booking.customerId)
    if (!customer) return

    customer.lifetimeVisits += 1
    if (!customer.lastBookingAt || booking.startTime > customer.lastBookingAt) {
      customer.lastBookingAt = booking.startTime
    }
    if (withinRange(booking.startTime, fromDate, toDate)) {
      customer.periodVisits += 1
    }
  })

  const activeCustomers = Array.from(bookingsByCustomer.entries())
    .filter(([, customer]) => customer.periodVisits > 0)
    .map(([id, customer]) => ({ id, ...customer }))

  const newCustomers = customers.filter((customer) => withinRange(customer.createdAt, fromDate, toDate)).length
  const recurringCustomers = activeCustomers.filter((customer) => customer.lifetimeVisits > 1).length
  const topCustomers = [...activeCustomers]
    .sort((a, b) => (b.periodVisits - a.periodVisits) || a.name.localeCompare(b.name))
    .slice(0, 5)
  const inactivityLimit = addDays(toDate, -60)
  const inactiveCustomers = Array.from(bookingsByCustomer.entries())
    .filter(([, customer]) => customer.lastBookingAt && customer.lastBookingAt < inactivityLimit)
    .map(([id, customer]) => ({
      id,
      name: customer.name,
      lastBookingAt: customer.lastBookingAt!.toISOString(),
    }))
    .sort((a, b) => a.lastBookingAt.localeCompare(b.lastBookingAt))
    .slice(0, 5)

  const servicesRevenue = topServices.reduce((sum, item) => sum + item.revenue, 0)
  const extrasRevenue = topExtras.reduce((sum, item) => sum + item.revenue, 0)
  const productsRevenue = topProducts.reduce((sum, item) => sum + item.revenue, 0)
  const salesMixTotal = servicesRevenue + extrasRevenue + productsRevenue

  const lossRate = bookings.length > 0 ? ((cancelledBookings.length + noShowBookings.length) / bookings.length) * 100 : 0
  const cancellationRate = bookings.length > 0 ? (cancelledBookings.length / bookings.length) * 100 : 0
  const noShowRate = bookings.length > 0 ? (noShowBookings.length / bookings.length) * 100 : 0

  const insights: Array<{ title: string; description: string; tone: 'positive' | 'warning' | 'neutral' }> = []

  if (busiestDays[0]) {
    insights.push({
      title: 'Dia mais forte',
      description: `${busiestDays[0].label} lidera o movimento com ${busiestDays[0].bookings} marcações e ${busiestDays[0].occupancyRate.toFixed(0)}% de ocupação.`,
      tone: 'positive',
    })
  }

  const weakestDay = [...dailyAgenda]
    .filter((item) => item.availableMinutes > 0)
    .sort((a, b) => a.occupancyRate - b.occupancyRate)[0]
  if (weakestDay) {
    insights.push({
      title: 'Janela para promoções',
      description: `${weakestDay.label} teve a ocupação mais baixa (${weakestDay.occupancyRate.toFixed(0)}%), um bom candidato para campanhas de preenchimento.`,
      tone: 'warning',
    })
  }

  if (topServices[0]) {
    insights.push({
      title: 'Serviço campeão',
      description: `${topServices[0].name} foi o serviço mais procurado, com ${topServices[0].count} vendas e ${topServices[0].revenue.toFixed(2)}€ em faturação.`,
      tone: 'positive',
    })
  }

  if (topProducts[0] && productsRevenue > 0) {
    insights.push({
      title: 'Venda complementar',
      description: `Produtos somaram ${productsRevenue.toFixed(2)}€. ${topProducts[0].name} foi o artigo mais vendido e pode ser reforçado no checkout.`,
      tone: 'neutral',
    })
  }

  if (lossRate >= 15) {
    insights.push({
      title: 'Perda de agenda alta',
      description: `Cancelamentos e faltas representam ${lossRate.toFixed(1)}% das marcações do período. Vale rever confirmações e lembretes.`,
      tone: 'warning',
    })
  }

  if (recurringCustomers > newCustomers && recurringCustomers > 0) {
    insights.push({
      title: 'Base fiel ativa',
      description: `${recurringCustomers} clientes recorrentes voltaram no período, acima dos ${newCustomers} novos clientes.`,
      tone: 'positive',
    })
  }

  res.json({
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    overview: {
      totalRevenue,
      avgTicket,
      totalBookings: bookings.length,
      completedBookings: completed.length,
      cancelledBookings: cancelledBookings.length,
      noShowBookings: noShowBookings.length,
      planBookingsCount: planBookings.length,
      planRevenue,
    },
    billing: {
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      revenueByDay,
      revenueByWeek,
      revenueByMonth,
    },
    topServices,
    topExtras,
    topProducts,
    barbers: barbersReport,
    occupancy: {
      occupancyRate: totalAvailableMinutes > 0 ? (totalOccupiedMinutes / totalAvailableMinutes) * 100 : 0,
      totalAvailableMinutes,
      totalOccupiedMinutes,
      deadMinutes: totalDeadMinutes,
      busiestDays,
      dailyAgenda,
    },
    customers: {
      newCustomers,
      recurringCustomers,
      activeCustomers: activeCustomers.length,
      topCustomers,
      inactiveCustomers,
    },
    sales: {
      servicesRevenue,
      extrasRevenue,
      productsRevenue,
      productsSold: topProducts.reduce((sum, item) => sum + item.count, 0),
      salesMix: {
        services: salesMixTotal > 0 ? (servicesRevenue / salesMixTotal) * 100 : 0,
        extras: salesMixTotal > 0 ? (extrasRevenue / salesMixTotal) * 100 : 0,
        products: salesMixTotal > 0 ? (productsRevenue / salesMixTotal) * 100 : 0,
      },
    },
    cancellations: {
      cancelledBookings: cancelledBookings.length,
      noShowBookings: noShowBookings.length,
      lossRate,
      cancellationRate,
      noShowRate,
    },
    insights: insights.slice(0, 5),
  })
}
