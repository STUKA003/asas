import { create } from 'zustand'
import type { Service, Barber, Extra, Product, TimeSlot } from '@/lib/types'

interface CustomerInfo {
  attendeeName: string
  email: string
  name: string
  notes?: string
  phone: string
}

export interface BookingDraft {
  attendeeName: string
  barber: Barber
  date: string
  extras: Extra[]
  planDiscount?: number
  products: Product[]
  service: Service
  serviceCoveredByPlan?: boolean
  servicePrice: number
  slot: TimeSlot
  totalDuration: number
  totalPrice: number
}

interface CustomerPlanInfo { id: string; name: string; allowedServices: { id: string; name: string }[] }

interface BookingStore {
  barber: Barber | null
  customer: CustomerInfo | null
  customerPlan: CustomerPlanInfo | null
  date: string | null
  extras: Extra[]
  products: Product[]
  reset:          () => void
  service: Service | null
  setBarber:      (b: Barber)   => void
  setCustomer:    (c: CustomerInfo) => void
  setCustomerPlan:(p: CustomerPlanInfo | null) => void
  setDate:        (d: string)   => void
  step: number
  slot: TimeSlot | null
  setStep:        (step: number) => void
  setService:     (s: Service)  => void
  setSlot:        (s: TimeSlot) => void
  toggleExtra:    (e: Extra)    => void
  toggleProduct:  (p: Product) => void
}

const initial = {
  step: 0, service: null, barber: null, date: null,
  slot: null, extras: [], customer: null, customerPlan: null, products: [],
}

export const useBookingStore = create<BookingStore>((set) => ({
  ...initial,
  setStep:    (step)    => set({ step }),
  setService: (service) => set({ service, barber: null, date: null, slot: null }),
  setBarber:  (barber)  => set({ barber, date: null, slot: null }),
  setDate:    (date)    => set({ date, slot: null }),
  setSlot:    (slot)    => set({ slot }),
  toggleExtra: (extra) => {
    set((state) => {
      const has = state.extras.find((e) => e.id === extra.id)
      return { extras: has ? state.extras.filter((e) => e.id !== extra.id) : [...state.extras, extra] }
    })
  },
  setCustomer:     (customer)     => set({ customer }),
  setCustomerPlan: (customerPlan) => set({ customerPlan }),
  toggleProduct: (product) => {
    set((state) => {
      const has = state.products.find((p) => p.id === product.id)
      return { products: has ? state.products.filter((p) => p.id !== product.id) : [...state.products, product] }
    })
  },
  reset: () => set(initial),
}))
