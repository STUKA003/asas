import { prisma } from './prisma'

type BookingNotificationInput = {
  barberId: string
  barbershopId: string
  bookingId: string
  customerName: string
  source: 'admin' | 'public'
  startTime: Date
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

export async function notifyBookingCreated(input: BookingNotificationInput) {
  const sourceLabel = input.source === 'public' ? 'online' : 'manual'
  const message = `Nova marcação ${sourceLabel} de ${input.customerName} para as ${formatTime(input.startTime)}`

  await prisma.notification.create({
    data: {
      barbershopId: input.barbershopId,
      barberId: input.barberId,
      bookingId: input.bookingId,
      type: 'BOOKING_CREATED',
      message,
    },
  })
}
