/**
 * scheduling.ts
 * Pure scheduling logic — no DB, no side effects, fully testable.
 *
 * TERMINOLOGY
 * -----------
 * TimeRange    : { start, end } in epoch-ms
 * WorkingWindow: the barber's open window for a given day
 * BusyInterval : any period the barber cannot be booked
 *                (existing bookings + blocked times, merged together)
 * Slot         : a candidate appointment window of exactly `durationMs`
 * Granularity  : how far apart slot start-times are (default 15 min)
 *
 * ALGORITHM
 * ---------
 * 1. Validate: closed day → no working window → return []
 * 2. Validate: total duration > entire working window → return []
 * 3. Merge all busy intervals (bookings + blocked times) so overlapping
 *    blocks become single contiguous ranges — prevents double-counting.
 * 4. Step through the working window in `granularity` increments.
 *    For each candidate start `t`:
 *      a. Skip if t + duration > dayEnd  (would run past closing)
 *      b. Skip if t < notBefore          (past time on today)
 *      c. Skip if [t, t+duration] overlaps ANY merged busy interval
 *    → Otherwise, emit the slot.
 */

export const DEFAULT_SLOT_GRANULARITY_MINUTES = 15

// ─── Core types ─────────────────────────────────────────────────────────────

export interface TimeRange {
  start: number // epoch ms (inclusive)
  end: number   // epoch ms (exclusive)
}

export interface WorkingWindow {
  dayStart: number // epoch ms
  dayEnd: number   // epoch ms
}

export interface Slot {
  startTime: Date
  endTime: Date
}

/**
 * Returns true when slotStart is aligned to the configured grid relative to
 * the start of a working window.
 */
export function isSlotAlignedToWindowStart(
  windowStart: number,
  slotStart: number,
  granularityMinutes: number
): boolean {
  const granularityMs = granularityMinutes * 60_000
  if (granularityMs <= 0) return false
  if (slotStart < windowStart) return false
  return (slotStart - windowStart) % granularityMs === 0
}

// ─── Interval utilities ──────────────────────────────────────────────────────

/**
 * Merge a list of potentially-overlapping or adjacent TimeRanges into the
 * smallest set of non-overlapping ranges that covers the same time.
 *
 * Example:
 *   input:  [09:00-10:00], [09:30-11:00], [12:00-13:00], [13:00-14:00]
 *   output: [09:00-11:00], [12:00-14:00]
 */
export function mergeIntervals(intervals: TimeRange[]): TimeRange[] {
  if (intervals.length === 0) return []

  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: TimeRange[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i]
    const last = merged[merged.length - 1]

    if (curr.start <= last.end) {
      // Overlapping or exactly adjacent → extend the last range
      last.end = Math.max(last.end, curr.end)
    } else {
      merged.push({ ...curr })
    }
  }

  return merged
}

/**
 * Return true if `range` overlaps with at least one interval in `merged`
 * (the list is assumed to already be merged/sorted for performance).
 *
 * Overlap condition: A overlaps B  iff  A.start < B.end && A.end > B.start
 */
export function overlapsAny(range: TimeRange, merged: TimeRange[]): boolean {
  for (const b of merged) {
    if (range.start < b.end && range.end > b.start) return true
    // Since merged is sorted, if b.start > range.end we can stop early
    if (b.start >= range.end) break
  }
  return false
}

/**
 * Return the list of free sub-windows inside `window` after removing every
 * interval in `busy`.  Only busy intervals that overlap the window matter.
 *
 * Example:
 *   window: 09:00 – 18:00
 *   busy:   [10:00-11:00], [13:00-14:30]
 *   free:   [09:00-10:00], [11:00-13:00], [14:30-18:00]
 */
export function subtractIntervals(
  window: WorkingWindow,
  busy: TimeRange[]
): TimeRange[] {
  const relevant = busy.filter(
    (b) => b.start < window.dayEnd && b.end > window.dayStart
  )
  const merged = mergeIntervals(relevant)

  const free: TimeRange[] = []
  let cursor = window.dayStart

  for (const b of merged) {
    // Clamp to window bounds
    const bStart = Math.max(b.start, window.dayStart)
    const bEnd   = Math.min(b.end,   window.dayEnd)

    if (bStart > cursor) {
      free.push({ start: cursor, end: bStart })
    }
    cursor = Math.max(cursor, bEnd)
  }

  if (cursor < window.dayEnd) {
    free.push({ start: cursor, end: window.dayEnd })
  }

  return free
}

// ─── Duration helpers ────────────────────────────────────────────────────────

/** Parse "HH:MM" into epoch-ms for a given base date (resets seconds/ms). */
export function parseTimeStringToEpoch(timeStr: string, baseDate: Date): number {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(baseDate)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/**
 * Compute total appointment duration from service + extras.
 * Extras with duration = 0 are valid (price-only extras).
 */
export function computeTotalDuration(
  serviceDuration: number,
  extraDurations: number[]
): number {
  return serviceDuration + extraDurations.reduce((sum, d) => sum + d, 0)
}

// ─── Core slot-generation algorithm ─────────────────────────────────────────

export interface ComputeSlotsInput {
  /** Barber's working window for the target day. */
  workingWindow: WorkingWindow
  /** All busy intervals: merge of existing bookings + blocked times. */
  busyIntervals: TimeRange[]
  /** Total appointment duration in minutes (service + extras). */
  durationMinutes: number
  /**
   * How far apart slot start-times are, in minutes.
   * Default: 15.  Slots are anchored to dayStart; e.g. if dayStart=09:00
   * and granularity=15, candidates are 09:00, 09:15, 09:30, …
   */
  granularityMinutes?: number
  /**
   * Earliest allowed slot start as epoch-ms.
   * Set to Date.now() when the target date is today to skip past slots.
   * Defaults to 0 (no restriction).
   */
  notBefore?: number
}

/**
 * Main algorithm.  Returns every valid Slot within the working window.
 *
 * Time complexity: O(S * B) where S = number of slot candidates,
 * B = number of merged busy intervals.
 * In practice S ≤ ~48 (full day / 15-min slots) and B is tiny.
 */
export function computeAvailableSlots(input: ComputeSlotsInput): Slot[] {
  const {
    workingWindow,
    busyIntervals,
    durationMinutes,
    granularityMinutes = DEFAULT_SLOT_GRANULARITY_MINUTES,
    notBefore = 0,
  } = input

  const { dayStart, dayEnd } = workingWindow
  const durationMs    = durationMinutes    * 60_000
  const granularityMs = granularityMinutes * 60_000

  // ── Guard: closed day or zero-duration service
  if (dayStart >= dayEnd)   return []
  if (durationMs <= 0)      return []

  // ── Guard: service doesn't fit in the entire working window
  if (durationMs > dayEnd - dayStart) return []

  // ── Merge busy intervals once — reused for every candidate check
  const mergedBusy = mergeIntervals(busyIntervals)

  // ── Align cursor to first granularity boundary at or after `notBefore`
  //    relative to dayStart so slots are always at clean times (e.g. :00, :15…)
  const earliest    = Math.max(dayStart, notBefore)
  const elapsed     = earliest - dayStart
  const alignedStep = Math.ceil(elapsed / granularityMs) * granularityMs
  let cursor        = dayStart + alignedStep

  const slots: Slot[] = []

  while (cursor + durationMs <= dayEnd) {
    const candidate: TimeRange = { start: cursor, end: cursor + durationMs }

    if (!overlapsAny(candidate, mergedBusy)) {
      slots.push({
        startTime: new Date(cursor),
        endTime:   new Date(cursor + durationMs),
      })
    }

    cursor += granularityMs
  }

  return slots
}
