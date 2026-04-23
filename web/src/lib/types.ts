export interface Barbershop {
  id: string; name: string; slug: string; phone?: string; address?: string; whatsapp?: string; instagram?: string; logoUrl?: string; heroImageUrl?: string; heroTitle?: string; heroSubtitle?: string; heroButtonText?: string; aboutText?: string; galleryImages?: string[]; promoEnabled: boolean; promoTitle?: string; promoText?: string; promoButtonText?: string; showPlans: boolean; showProducts: boolean; planMemberDiscount: number; slotGranularityMinutes: 5 | 10 | 15 | 20 | 30; accentColor: string; plan: 'FREE' | 'BASIC' | 'PRO'
  currentUser?: { id: string; name: string; email: string; avatar?: string | null } | null
  subscription?: {
    plan: 'FREE' | 'BASIC' | 'PRO'
    paidPlan: 'FREE' | 'BASIC' | 'PRO'
    endsAt?: string | null
    expired: boolean
    stripeStatus?: string | null
    hasCustomer: boolean
    hasSubscription: boolean
    limits: {
      maxBarbers: number | null
      maxMonthlyBookings: number | null
      activeBarbers: number | null
      monthlyBookings: number | null
    }
  }
}
export interface Barber {
  id: string; name: string; email?: string; phone?: string; avatar?: string; active: boolean; hasAccess?: boolean
}
export interface Service {
  id: string; name: string; description?: string; price: number; duration: number; active: boolean
}
export interface Extra {
  id: string; name: string; description?: string; price: number; duration: number; active: boolean
}
export interface Product {
  id: string; name: string; description?: string; imageUrl?: string; price: number; stock: number; active: boolean
}
export interface Plan {
  id: string; name: string; description?: string; price: number; paymentLink?: string | null; intervalDays: number; allowedDays: number[]; allowedServices: Pick<Service, 'id' | 'name'>[]; active: boolean
}
export interface Customer {
  id: string; name: string; email?: string; phone?: string; planId?: string; plan?: Plan
  insights?: {
    activeBookings: number
    cancelledBookings: number
    completedBookings: number
    lastBookingAt?: string | null
    lastVisitAt?: string | null
    noShowBookings: number
    reliability: 'NEW' | 'TRUSTED' | 'ATTENTION' | 'RISK'
    totalBookings: number
    totalSpent: number
  }
}
export interface CustomerDetail extends Customer {
  notes?: string
  bookings: Array<Pick<Booking, 'id' | 'startTime' | 'status' | 'totalPrice'> & { barber?: Pick<Barber, 'id' | 'name'> }>
}
export interface CustomerPlanLookup {
  customer: null | {
    id: string
    name: string
    phone?: string
    plan: null | Pick<Plan, 'id' | 'name' | 'allowedDays' | 'allowedServices'>
    activeBooking: null | Pick<Booking, 'id' | 'startTime' | 'status'>
  }
}
export interface Booking {
  id: string; startTime: string; endTime: string; status: BookingStatus
  totalPrice: number; totalDuration: number; notes?: string
  barber: Pick<Barber, 'id' | 'name'>
  customer: Pick<Customer, 'id' | 'name' | 'phone'> & { plan?: { id: string; name: string } | null }
  services: { serviceId: string; price: number; duration: number; service: Pick<Service, 'id' | 'name'> }[]
  extras:   { id: string; extraId: string;   price: number; duration: number; extra:   Pick<Extra,   'id' | 'name'> }[]
  products: { id: string; productId: string; price: number; product: Pick<Product, 'id' | 'name'> }[]
}
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
export interface TimeSlot { startTime: string; endTime: string }
export interface ManagedBooking extends Booking {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email'> & { plan?: { id: string; name: string } | null }
  management: {
    managementToken: string
    managementUrl: string
  }
  canConfirm: boolean
  canCancel: boolean
  canReschedule: boolean
}
export interface CustomerBookingSummary extends Booking {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email'> & { plan?: { id: string; name: string } | null }
}
export interface CustomerBookingLookup {
  customer: null | Pick<Customer, 'id' | 'name' | 'phone' | 'email'>
  bookings: CustomerBookingSummary[]
}
export interface BlockedTime {
  id: string
  startTime: string
  endTime: string
  reason?: string | null
  barberId?: string | null
  barber?: Pick<Barber, 'id' | 'name'> | null
}
