/**
 * availability.ts
 * DB-aware availability layer.  Fetches data from Prisma and delegates
 * all scheduling math to the pure functions in scheduling.ts.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import {
  computeAvailableSlots,
  parseTimeStringToEpoch,
  isSlotAlignedToWindowStart,
  type TimeRange,
  type Slot,
} from './scheduling'

export type { Slot }

type AvailabilityDbClient = PrismaClient | Prisma.TransactionClient

function parseDateOnly(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return new Date(date)

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
}

// ─── Working-hours resolution ────────────────────────────────────────────────

/**
 * Resolve working hours for a barber + day.
 * Priority: barber-specific hours > shop-wide hours (barberId = null).
 * Returns null if the day is closed.
 */
async function resolveWorkingHours(
  barberId: string,
  barbershopId: string,
  dayOfWeek: number,
  db: AvailabilityDbClient = prisma
) {
  const specific = await db.workingHours.findMany({
    where: { barbershopId, barberId, dayOfWeek, active: true },
    orderBy: { startTime: 'asc' },
  })
  if (specific.length > 0) return specific

  return db.workingHours.findMany({
    where: { barbershopId, barberId: null, dayOfWeek, active: true },
    orderBy: { startTime: 'asc' },
  })
}

async function getSlotGranularityMinutes(barbershopId: string, db: AvailabilityDbClient = prisma): Promise<number> {
  const shop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { slotGranularityMinutes: true },
  })

  return shop?.slotGranularityMinutes ?? 15
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Return every available slot for a barber on a given date.
 *
 * @param durationMinutes  Total appointment time: service.duration + sum(extra.duration)
 */
export async function getAvailableSlots(
  barberId: string,
  barbershopId: string,
  date: string,
  durationMinutes: number,
  granularityMinutes = 15
): Promise<Slot[]> {
  const targetDate = parseDateOnly(date)
  const dayOfWeek = targetDate.getDay()

  const workingHours = await resolveWorkingHours(barberId, barbershopId, dayOfWeek)
  if (workingHours.length === 0) return [] // closed day

  // ── Fetch bookings that OVERLAP the working window (correct range query)
  //    Previous bug used `startTime: gte + endTime: lte` which missed bookings
  //    that start before dayStart or end after dayEnd.
  const earliestStart = Math.min(...workingHours.map((item) => parseTimeStringToEpoch(item.startTime, targetDate)))
  const latestEnd = Math.max(...workingHours.map((item) => parseTimeStringToEpoch(item.endTime, targetDate)))

  const existingBookings = await prisma.booking.findMany({
    where: {
      barberId,
      barbershopId,
      status: { notIn: ['CANCELLED'] },
      startTime: { lt: new Date(latestEnd)   }, // booking starts before window ends
      endTime:   { gt: new Date(earliestStart) }, // booking ends   after window starts
    },
    select: { startTime: true, endTime: true },
  })

  // ── Fetch blocked times (barber-specific OR shop-wide) that overlap window
  const blockedTimes = await prisma.blockedTime.findMany({
    where: {
      barbershopId,
      OR: [{ barberId }, { barberId: null }],
      startTime: { lt: new Date(latestEnd)   },
      endTime:   { gt: new Date(earliestStart) },
    },
    select: { startTime: true, endTime: true },
  })

  const busyIntervals: TimeRange[] = [
    ...existingBookings.map((b) => ({ start: b.startTime.getTime(), end: b.endTime.getTime() })),
    ...blockedTimes.map((b)    => ({ start: b.startTime.getTime(), end: b.endTime.getTime() })),
  ]

  // ── Skip past slots when generating for today
  const isToday  = targetDate.toDateString() === new Date().toDateString()
  const notBefore = isToday ? Date.now() : 0

  return workingHours.flatMap((item) => {
    const dayStart = parseTimeStringToEpoch(item.startTime, targetDate)
    const dayEnd = parseTimeStringToEpoch(item.endTime, targetDate)

    return computeAvailableSlots({
      workingWindow: { dayStart, dayEnd },
      busyIntervals,
      durationMinutes,
      granularityMinutes,
      notBefore,
    })
  })
}

/**
 * Return true if a proposed [startTime, endTime] window for a barber
 * conflicts with any non-cancelled booking (optionally excluding one booking
 * by ID, useful when rescheduling an existing appointment).
 */
export async function checkOverlap(
  barberId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
  db: AvailabilityDbClient = prisma
): Promise<boolean> {
  const booking = await db.booking.findFirst({
    where: {
      barberId,
      status: { notIn: ['CANCELLED'] },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startTime: { lt: endTime  },
      endTime:   { gt: startTime },
    },
  })
  return !!booking
}

/**
 * Return true if the proposed window falls within a blocked time for this
 * barber (either a barber-specific block or a shop-wide block).
 */
export async function checkBlockedTime(
  barberId: string,
  barbershopId: string,
  startTime: Date,
  endTime: Date,
  db: AvailabilityDbClient = prisma
): Promise<boolean> {
  const blocked = await db.blockedTime.findFirst({
    where: {
      barbershopId,
      OR: [{ barberId }, { barberId: null }],
      startTime: { lt: endTime  },
      endTime:   { gt: startTime },
    },
  })
  return !!blocked
}

/**
 * Return true if the proposed [startTime, endTime] window falls entirely
 * within the barber's working hours for that day of week.
 * Uses the same barber-specific > shop-wide priority as getAvailableSlots.
 */
export async function isWithinWorkingHours(
  barberId: string,
  barbershopId: string,
  startTime: Date,
  endTime: Date,
  db: AvailabilityDbClient = prisma
): Promise<boolean> {
  const dayOfWeek = startTime.getDay()
  const workingHours = await resolveWorkingHours(barberId, barbershopId, dayOfWeek, db)
  if (workingHours.length === 0) return false

  const base = new Date(startTime)

  return workingHours.some((item) => {
    const whStart = parseTimeStringToEpoch(item.startTime, base)
    const whEnd = parseTimeStringToEpoch(item.endTime, base)
    return startTime.getTime() >= whStart && endTime.getTime() <= whEnd
  })
}

/**
 * Validate that a requested booking start-time is actually available.
 * Combines all three checks in one place for use in createBooking.
 *
 * Returns an error message string, or null if the slot is valid.
 */
export async function validateSlot(
  barberId: string,
  barbershopId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
  db: AvailabilityDbClient = prisma
): Promise<string | null> {
  if (startTime.getTime() < Date.now()) return 'Time slot is in the past'

  const [workingHours, granularityMinutes, hasOverlap, isBlocked] = await Promise.all([
    resolveWorkingHours(barberId, barbershopId, startTime.getDay(), db),
    getSlotGranularityMinutes(barbershopId, db),
    checkOverlap(barberId, startTime, endTime, excludeBookingId, db),
    checkBlockedTime(barberId, barbershopId, startTime, endTime, db),
  ])

  const withinHours = workingHours.some((item) => {
    const whStart = parseTimeStringToEpoch(item.startTime, startTime)
    const whEnd = parseTimeStringToEpoch(item.endTime, startTime)

    return (
      startTime.getTime() >= whStart &&
      endTime.getTime() <= whEnd &&
      isSlotAlignedToWindowStart(whStart, startTime.getTime(), granularityMinutes)
    )
  })

  if (!withinHours) return 'Time slot is outside barber working hours'
  if (hasOverlap)   return 'Barber already has a booking in this time slot'
  if (isBlocked)    return 'Time slot is blocked'

  return null
}
