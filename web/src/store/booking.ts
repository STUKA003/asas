import { create } from 'zustand'
import type { Service, Barber, Extra, Product, TimeSlot } from '@/lib/types'

interface CustomerInfo { name: string; phone: string; email?: string; notes?: string }
interface CustomerPlanInfo { id: string; name: string; allowedServices: { id: string; name: string }[] }

interface BookingStore {
  step: number
  service: Service | null
  barber: Barber | null
  date: string | null
  slot: TimeSlot | null
  extras: Extra[]
  customer: CustomerInfo | null
  customerPlan: CustomerPlanInfo | null
  products: Product[]

  setStep:        (step: number) => void
  setService:     (s: Service)  => void
  setBarber:      (b: Barber)   => void
  setDate:        (d: string)   => void
  setSlot:        (s: TimeSlot) => void
  toggleExtra:    (e: Extra)    => void
  setCustomer:    (c: CustomerInfo) => void
  setCustomerPlan:(p: CustomerPlanInfo | null) => void
  toggleProduct:  (p: Product) => void
  reset:          () => void
}

const initial = {
  step: 0, service: null, barber: null, date: null,
  slot: null, extras: [], customer: null, customerPlan: null, products: [],
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  ...initial,
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
  reset: () => set(initial),
}))
