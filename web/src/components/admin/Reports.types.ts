export interface RankItem {
  id: string
  name: string
  count: number
  revenue: number
}

export interface BarberStat {
  id: string
  name: string
  bookings: number
  revenue: number
  avgTicket: number
  occupancyRate: number
  occupiedMinutes: number
  availableMinutes: number
  extrasCount: number
  extrasRevenue: number
  productsCount: number
  productsRevenue: number
  planCustomersCount: number
}

export interface RevenueSeriesItem {
  label: string
  revenue: number
}

export interface DayAgenda {
  day: string
  label: string
  occupiedMinutes: number
  availableMinutes: number
  deadMinutes: number
  bookings: number
  revenue: number
  occupancyRate: number
}

export interface CustomerSummaryItem {
  id: string
  name: string
  periodVisits?: number
  lastBookingAt?: string
}

export interface Insight {
  title: string
  description: string
  tone: 'positive' | 'warning' | 'neutral'
}

export interface ReportData {
  period: { from: string; to: string }
  overview: {
    totalRevenue: number
    avgTicket: number
    totalBookings: number
    completedBookings: number
    cancelledBookings: number
    noShowBookings: number
    planBookingsCount: number
    planRevenue: number
  }
  billing: {
    dailyRevenue: number
    weeklyRevenue: number
    monthlyRevenue: number
    revenueByDay: RevenueSeriesItem[]
    revenueByWeek: RevenueSeriesItem[]
    revenueByMonth: RevenueSeriesItem[]
  }
  topServices: RankItem[]
  topExtras: RankItem[]
  topProducts: RankItem[]
  barbers: BarberStat[]
  occupancy: {
    occupancyRate: number
    totalAvailableMinutes: number
    totalOccupiedMinutes: number
    deadMinutes: number
    busiestDays: DayAgenda[]
    dailyAgenda: DayAgenda[]
  }
  customers: {
    newCustomers: number
    recurringCustomers: number
    activeCustomers: number
    topCustomers: CustomerSummaryItem[]
    inactiveCustomers: CustomerSummaryItem[]
  }
  sales: {
    servicesRevenue: number
    extrasRevenue: number
    productsRevenue: number
    productsSold: number
    salesMix: {
      services: number
      extras: number
      products: number
    }
  }
  cancellations: {
    cancelledBookings: number
    noShowBookings: number
    lossRate: number
    cancellationRate: number
    noShowRate: number
  }
  insights: Insight[]
}
