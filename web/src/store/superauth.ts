import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SuperAuthState {
  token: string | null
  login: (token: string) => void
  logout: () => void
}

export const useSuperAuthStore = create<SuperAuthState>()(
  persist(
    (set) => ({
      token: null,
      login: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    { name: 'superadmin-auth' }
  )
)
