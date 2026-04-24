import { prisma } from './prisma'
import { sendNotificationPush } from './push'
import { formatStoredWallClockDayMonthTime } from './datetime'

type BookingNotificationInput = {
  barberId: string
  barbershopId: string
  bookingId: string
  customerName: string
  source: 'admin' | 'public'
  startTime: Date
}

type CustomerBookingActionInput = {
  barberId: string
  barbershopId: string
  bookingId: string
  customerName: string
  kind: 'cancelled' | 'confirmed' | 'rescheduled'
  startTime?: Date
}

function formatTime(date: Date) {
  return formatStoredWallClockDayMonthTime(date)
}

export async function notifyBookingCreated(input: BookingNotificationInput) {
  const sourceLabel = input.source === 'public' ? 'online' : 'manual'
  const message = `Nova marcação ${sourceLabel} de ${input.customerName} para ${formatTime(input.startTime)}`

  await prisma.notification.create({
    data: {
      barbershopId: input.barbershopId,
      barberId: input.barberId,
      bookingId: input.bookingId,
      type: 'BOOKING_CREATED',
      message,
    },
  })

  await sendNotificationPush({
    barbershopId: input.barbershopId,
    barberId: input.barberId,
    bookingId: input.bookingId,
    body: message,
  })
}

export async function notifyCustomerBookingAction(input: CustomerBookingActionInput) {
  const details = input.startTime ? ` para ${formatTime(input.startTime)}` : ''
  const typeMap = {
    cancelled: 'BOOKING_CUSTOMER_CANCELLED',
    confirmed: 'BOOKING_CUSTOMER_CONFIRMED',
    rescheduled: 'BOOKING_CUSTOMER_RESCHEDULED',
  } as const
  const verbMap = {
    cancelled: 'cancelou',
    confirmed: 'confirmou',
    rescheduled: 'remarcou',
  } as const

  await prisma.notification.create({
    data: {
      barbershopId: input.barbershopId,
      barberId: input.barberId,
      bookingId: input.bookingId,
      type: typeMap[input.kind],
      message: `${input.customerName} ${verbMap[input.kind]} a marcação${details}`,
    },
  })

  await sendNotificationPush({
    barbershopId: input.barbershopId,
    barberId: input.barberId,
    bookingId: input.bookingId,
    body: `${input.customerName} ${verbMap[input.kind]} a marcação${details}`,
  })
}
