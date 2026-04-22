import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { useBarberAuthStore } from '@/store/barberAuth'
import { useSuperAuthStore } from '@/store/superauth'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  // Only inject barbershop token if no Authorization header already set (e.g. superadmin calls)
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function isBarberRequest(url?: string) {
  return !!url && (url.includes('/barber-portal') || url.includes('/barber-auth'))
}

function isSuperadminRequest(url?: string) {
  return !!url && url.includes('/superadmin')
}

function isLoginRequest(url?: string) {
  return !!url && (
    url.includes('/auth/login') ||
    url.includes('/barber-auth/login') ||
    url.includes('/superadmin/auth/login')
  )
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const requestUrl = err.config?.url as string | undefined

    if (err.response?.status === 401) {
      if (isLoginRequest(requestUrl)) {
        return Promise.reject(err)
      }

      if (isBarberRequest(requestUrl)) {
        useBarberAuthStore.getState().logout()
        window.location.href = '/barber/login'
      } else if (isSuperadminRequest(requestUrl)) {
        useSuperAuthStore.getState().logout()
        window.location.href = '/superadmin/login'
      } else {
        useAuthStore.getState().logout()
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(err)
  }
)

// -- Auth
export const authApi = {
  login: (data: { email: string; password: string; slug: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  register: (data: object) => api.post('/auth/register', data).then((r) => r.data),
  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }).then((r) => r.data),
  resendVerificationEmail: (data: { email: string; slug: string }) =>
    api.post('/auth/verify-email/resend', data).then((r) => r.data),
  forgotPassword: (data: { email: string; slug: string }) =>
    api.post('/auth/forgot-password', data).then((r) => r.data),
  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
}

// -- Barbershop
export const barbershopApi = {
  get: () => api.get('/barbershop').then((r) => r.data),
  update: (data: object) => api.put('/barbershop', data).then((r) => r.data),
  createCheckoutSession: (data: { plan: 'BASIC' | 'PRO' }) =>
    api.post('/barbershop/subscription/checkout-session', data).then((r) => r.data),
  createPortalSession: () =>
    api.post('/barbershop/subscription/portal-session').then((r) => r.data),
}

// -- Generic CRUD factory
function crud<T>(path: string) {
  return {
    list:   (params?: object)         => api.get<T[]>(path, { params }).then((r) => r.data),
    get:    (id: string)              => api.get<T>(`${path}/${id}`).then((r) => r.data),
    create: (data: object)            => api.post<T>(path, data).then((r) => r.data),
    update: (id: string, data: object) => api.put<T>(`${path}/${id}`, data).then((r) => r.data),
    remove: (id: string)              => api.delete(`${path}/${id}`),
  }
}

export const barbersApi   = crud('/barbers')
export const servicesApi  = crud('/services')
export const extrasApi    = crud('/extras')
export const productsApi  = crud('/products')
export const plansApi     = crud('/plans')
export const plansReportApi = {
  get: (params?: { from?: string; to?: string }) =>
    api.get('/plans/report', { params }).then((r) => r.data),
}
export const customersApi = crud('/customers')
export const customersImportApi = {
  import: (rows: Array<{ name: string; phone?: string; email?: string; notes?: string }>) =>
    api.post('/customers/import', { rows }).then((r) => r.data),
}
export const bookingsApi  = {
  ...crud('/bookings'),
  availability: (params: { barberId: string; date: string; duration: number }) =>
    api.get('/bookings/availability', { params }).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/bookings/${id}/status`, { status }).then((r) => r.data),
  reschedule: (id: string, data: { startTime: string; barberId?: string }) =>
    api.patch(`/bookings/${id}/reschedule`, data).then((r) => r.data),
  addItems: (id: string, data: { extraIds?: string[]; productIds?: string[] }) =>
    api.patch(`/bookings/${id}/items`, data).then((r) => r.data),
  removeItem: (id: string, data: { type: 'extra' | 'product'; itemId: string }) =>
    api.patch(`/bookings/${id}/items/remove`, data).then((r) => r.data),
  reports: (params?: { from?: string; to?: string }) =>
    api.get('/bookings/reports', { params }).then((r) => r.data),
}
export const workingHoursApi  = crud('/working-hours')
export const blockedTimesApi  = crud('/blocked-times')

// -- Barber portal (uses barber token)
function barberHttp() {
  const token = localStorage.getItem('barber-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const barberAuthApi = {
  login: (data: { slug: string; email: string; password: string }) =>
    api.post('/barber-auth/login', data).then((r) => r.data),
  me: () =>
    api.get('/barber-auth/me', { headers: barberHttp() }).then((r) => r.data),
}

export const barberPortalApi = {
  bookings: (params?: { date?: string; from?: string; to?: string }) =>
    api.get('/barber-portal/bookings', { headers: barberHttp(), params }).then((r) => r.data),
  stats: () =>
    api.get('/barber-portal/stats', { headers: barberHttp() }).then((r) => r.data),
  extras: () =>
    api.get('/barber-portal/extras', { headers: barberHttp() }).then((r) => r.data),
  products: () =>
    api.get('/barber-portal/products', { headers: barberHttp() }).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/barber-portal/bookings/${id}/status`, { status }, { headers: barberHttp() }).then((r) => r.data),
  reschedule: (id: string, startTime: string) =>
    api.patch(`/barber-portal/bookings/${id}/reschedule`, { startTime }, { headers: barberHttp() }).then((r) => r.data),
  addItems: (id: string, data: { extraIds?: string[]; productIds?: string[] }) =>
    api.patch(`/barber-portal/bookings/${id}/items`, data, { headers: barberHttp() }).then((r) => r.data),
  removeItem: (id: string, data: { type: 'extra' | 'product'; itemId: string }) =>
    api.patch(`/barber-portal/bookings/${id}/items/remove`, data, { headers: barberHttp() }).then((r) => r.data),
  notifications: () =>
    api.get('/barber-portal/notifications', { headers: barberHttp() }).then((r) => r.data),
  unreadNotifications: () =>
    api.get('/barber-portal/notifications/unread', { headers: barberHttp() }).then((r) => r.data),
  markNotificationsRead: () =>
    api.patch('/barber-portal/notifications/read-all', {}, { headers: barberHttp() }).then((r) => r.data),
}

export const notificationsApi = {
  list:        () => api.get('/notifications').then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread').then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
}

export const barbersPasswordApi = {
  set: (id: string, password: string | null) =>
    api.patch(`/barbers/${id}/password`, { password }).then((r) => r.data),
}

// -- Super Admin (uses its own token, separate from barbershop auth)
export const superadminApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/superadmin/auth/login', data).then((r) => r.data),
  stats: (token: string) =>
    api.get('/superadmin/stats', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data),
  listBarbershops: (token: string, q?: string, verification?: 'all' | 'pending' | 'verified', health?: 'all' | 'active' | 'suspended' | 'unverified' | 'no-plan') =>
    api.get('/superadmin/barbershops', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        ...(q ? { q } : {}),
        ...(verification && verification !== 'all' ? { verification } : {}),
        ...(health && health !== 'all' ? { health } : {}),
      },
    }).then((r) => r.data),
  updateBarbershop: (token: string, id: string, data: { name: string; slug: string }) =>
    api.patch(`/superadmin/barbershops/${id}`, data, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data),
  resendVerification: (token: string, id: string) =>
    api.post(`/superadmin/barbershops/${id}/resend-verification`, {}, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data),
  verifyOwnerEmail: (token: string, id: string) =>
    api.patch(`/superadmin/barbershops/${id}/verify-email`, {}, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data),
  updateSubscription: (token: string, id: string, data: { plan: string; endsAt?: string | null }) =>
    api.patch(`/superadmin/barbershops/${id}/subscription`, data, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data),
  suspend: (token: string, id: string, data: { suspended: boolean; reason?: string }) =>
    api.patch(`/superadmin/barbershops/${id}/suspend`, data, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data),
  createBarbershop: (token: string, data: object) =>
    api.post('/superadmin/barbershops', data, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data),
  deleteBarbershop: (token: string, id: string) =>
    api.delete(`/superadmin/barbershops/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  createSupportSession: (token: string, id: string) =>
    api.post(`/superadmin/barbershops/${id}/support-session`, {}, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data),
}
