import { create } from 'zustand'
import type { Service, Barber, Extra, Product, TimeSlot } from '@/lib/types'

interface CustomerInfo {
  attendeeName: string
  email: string
  name: string
  notes?: string
  phone: string
}

export interface BookingPartyItem {
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
  addPartyBooking: (booking: BookingPartyItem) => void
  barber: Barber | null
  customer: CustomerInfo | null
  customerPlan: CustomerPlanInfo | null
  date: string | null
  extras: Extra[]
  party: BookingPartyItem[]
  products: Product[]
  removePartyBooking: (index: number) => void
  resetCurrentBooking: (options?: { attendeeName?: string }) => void
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
  slot: null, extras: [], customer: null, customerPlan: null, products: [], party: [],
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  ...initial,
  addPartyBooking: (booking) => set({ party: [...get().party, booking] }),
  setStep:    (step)    => set({ step }),
  setService: (service) => set({ service, barber: null, date: null, slot: null }),
  setBarber:  (barber)  => set({ barber, date: null, slot: null }),
  setDate:    (date)    => set({ date, slot: null }),
  setSlot:    (slot)    => set({ slot }),
  toggleExtra: (extra) => {
    const has = get().extras.find((e) => e.id === extra.id)
    set({ extras: has ? get().extras.filter((e) => e.id !== extra.id) : [...get().extras, extra] })
  },
  setCustomer:     (customer)     => set({ customer }),
  setCustomerPlan: (customerPlan) => set({ customerPlan }),
  toggleProduct: (product) => {
    const has = get().products.find((p) => p.id === product.id)
    set({ products: has ? get().products.filter((p) => p.id !== product.id) : [...get().products, product] })
  },
  removePartyBooking: (index) => set({ party: get().party.filter((_, itemIndex) => itemIndex !== index) }),
  resetCurrentBooking: (options) => set((state) => ({
    service: null,
    barber: null,
    date: null,
    slot: null,
    extras: [],
    products: [],
    customerPlan: null,
    customer: state.customer
      ? {
          ...state.customer,
          attendeeName: options?.attendeeName ?? '',
        }
      : state.customer,
  })),
  reset: () => set(initial),
}))
