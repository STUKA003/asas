import jwt from 'jsonwebtoken'

type BookingManagementPayload = {
  barbershopId: string
  bookingId: string
  type: 'booking-management'
}

function requiredJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) throw new Error('Missing required env var: JWT_SECRET')
  return secret
}

export function issueBookingManagementToken(bookingId: string, barbershopId: string) {
  return jwt.sign(
    { bookingId, barbershopId, type: 'booking-management' satisfies BookingManagementPayload['type'] },
    requiredJwtSecret(),
    { expiresIn: '180d' }
  )
}

export function verifyBookingManagementToken(token: string) {
  const payload = jwt.verify(token, requiredJwtSecret()) as Partial<BookingManagementPayload>

  if (
    payload.type !== 'booking-management' ||
    typeof payload.bookingId !== 'string' ||
    typeof payload.barbershopId !== 'string'
  ) {
    throw new Error('Invalid booking management token')
  }

  return payload as BookingManagementPayload
}
