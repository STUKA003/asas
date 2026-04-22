/**
 * publicApi — unauthenticated API calls, scoped to a barbershop slug.
 * Used by the public booking flow (no JWT required).
 */
import axios from 'axios'
import type { Barbershop, Barber, Service, Extra, Product, Plan, TimeSlot, CustomerPlanLookup, ManagedBooking } from './types'

const http = axios.create({ baseURL: '/api/public' })

interface AvailabilityParams {
  barberId: string
  date: string
  duration: number
}

interface AvailabilityResponse {
  barberId: string
  date: string
  durationMinutes: number
  slots: TimeSlot[]
}

interface CreateBookingPayload {
  barberId:   string
  serviceIds: string[]
  extraIds?:  string[]
  productIds?: string[]
  startTime:  string
  customer: {
    name:   string
    phone:  string
    email?: string
    notes?: string
  }
}

interface ManageBookingPayload {
  token: string
}

interface ManageBookingAvailabilityParams {
  token: string
  date: string
}

interface ManageBookingReschedulePayload extends ManageBookingPayload {
  startTime: string
}

export function publicApi(slug: string) {
  const base = `/${slug}`
  return {
    barbershop:   ()                              => http.get<Barbershop>(base).then((r) => r.data),
    services:     ()                              => http.get<Service[]>(`${base}/services`).then((r) => r.data),
    barbers:      ()                              => http.get<Barber[]>(`${base}/barbers`).then((r) => r.data),
    extras:       ()                              => http.get<Extra[]>(`${base}/extras`).then((r) => r.data),
    products:     ()                              => http.get<Product[]>(`${base}/products`).then((r) => r.data),
    plans:        ()                              => http.get<Plan[]>(`${base}/plans`).then((r) => r.data),
    customerPlan:  (p: { phone: string; name: string }) => http.post<CustomerPlanLookup>(`${base}/customer-plan`, p).then((r) => r.data),
    subscribePlan: (p: { planId: string; name: string; phone: string }) => http.post(`${base}/subscribe-plan`, p).then((r) => r.data),
    availability:  (p: AvailabilityParams)        => http.get<AvailabilityResponse>(`${base}/availability`, { params: p }).then((r) => r.data),
    createBooking: (p: CreateBookingPayload)       => http.post(`${base}/bookings`, p).then((r) => r.data),
    managedBooking: (p: ManageBookingPayload) =>
      http.get<{ booking: ManagedBooking }>(`${base}/bookings/manage`, { params: p }).then((r) => r.data),
    managedBookingAvailability: (p: ManageBookingAvailabilityParams) =>
      http.get<AvailabilityResponse>(`${base}/bookings/manage/availability`, { params: p }).then((r) => r.data),
    confirmManagedBooking: (p: ManageBookingPayload) =>
      http.patch<{ booking: ManagedBooking }>(`${base}/bookings/manage/confirm`, p).then((r) => r.data),
    cancelManagedBooking: (p: ManageBookingPayload) =>
      http.patch<{ booking: ManagedBooking }>(`${base}/bookings/manage/cancel`, p).then((r) => r.data),
    rescheduleManagedBooking: (p: ManageBookingReschedulePayload) =>
      http.patch<{ booking: ManagedBooking }>(`${base}/bookings/manage/reschedule`, p).then((r) => r.data),
  }
}
