type BookingInsightRecord = {
  startTime: Date
  status: string
  totalPrice: number
}

export type CustomerReliability = 'NEW' | 'TRUSTED' | 'ATTENTION' | 'RISK'

export type CustomerInsights = {
  activeBookings: number
  cancelledBookings: number
  completedBookings: number
  lastBookingAt: Date | null
  lastVisitAt: Date | null
  noShowBookings: number
  reliability: CustomerReliability
  totalBookings: number
  totalSpent: number
}

function computeReliability(input: {
  cancelledBookings: number
  completedBookings: number
  noShowBookings: number
  totalBookings: number
}): CustomerReliability {
  if (input.totalBookings < 2) return 'NEW'
  if (input.noShowBookings >= 2) return 'RISK'
  if (input.noShowBookings >= 1 || input.cancelledBookings >= 3) return 'ATTENTION'
  if (input.completedBookings >= 3) return 'TRUSTED'
  return 'NEW'
}

export function computeCustomerInsights(bookings: BookingInsightRecord[]): CustomerInsights {
  const completedBookings = bookings.filter((booking) => booking.status === 'COMPLETED')
  const cancelledBookings = bookings.filter((booking) => booking.status === 'CANCELLED').length
  const noShowBookings = bookings.filter((booking) => booking.status === 'NO_SHOW').length
  const activeBookings = bookings.filter((booking) => ['PENDING', 'CONFIRMED'].includes(booking.status)).length
  const totalSpent = completedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)

  const sortedByDateDesc = [...bookings].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  const sortedCompletedDesc = [...completedBookings].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())

  return {
    totalBookings: bookings.length,
    completedBookings: completedBookings.length,
    cancelledBookings,
    noShowBookings,
    activeBookings,
    totalSpent,
    lastBookingAt: sortedByDateDesc[0]?.startTime ?? null,
    lastVisitAt: sortedCompletedDesc[0]?.startTime ?? null,
    reliability: computeReliability({
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings,
      noShowBookings,
    }),
  }
}
