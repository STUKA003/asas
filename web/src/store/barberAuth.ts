import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BarberUser {
  id: string
  name: string
  email: string
  avatar?: string
  barbershopId: string
  barbershop?: {
    name: string
    slug: string
    logoUrl?: string
    accentColor?: string
    slotGranularityMinutes?: 5 | 10 | 15 | 20 | 30
    subscriptionPlan?: 'FREE' | 'BASIC' | 'PRO'
    subscriptionEndsAt?: string | null
  }
}

interface BarberAuthStore {
  token: string | null
  barber: BarberUser | null
  setAuth: (token: string, barber: BarberUser) => void
  setBarber: (barber: BarberUser) => void
  logout: () => void
}

export const useBarberAuthStore = create<BarberAuthStore>()(
  persist(
    (set) => ({
      token: null,
      barber: null,
      setAuth: (token, barber) => {
        localStorage.setItem('barber-token', token)
        set({ token, barber })
      },
      setBarber: (barber) => set((state) => ({ ...state, barber })),
      logout: () => {
        localStorage.removeItem('barber-token')
        set({ token: null, barber: null })
      },
    }),
    { name: 'barber-auth' }
  )
)
