/**
 * scheduling.examples.ts
 * Run with:  npx tsx src/utils/scheduling.examples.ts
 *
 * All examples use pure functions (no DB).
 * Dates are fixed to 2024-01-15 (Monday) for reproducibility.
 */

import {
  computeAvailableSlots,
  computeTotalDuration,
  mergeIntervals,
  subtractIntervals,
  overlapsAny,
  parseTimeStringToEpoch,
  type TimeRange,
  type Slot,
} from './scheduling'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_DATE = new Date('2024-01-15T00:00:00.000Z') // Monday

function ms(timeStr: string): number {
  return parseTimeStringToEpoch(timeStr, BASE_DATE)
}

function fmt(d: Date): string {
  return d.toTimeString().slice(0, 5)
}

function fmtSlots(slots: Slot[]): string {
  if (!slots.length) return '  (none)'
  return slots.map((s) => `  ${fmt(s.startTime)} → ${fmt(s.endTime)}`).join('\n')
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

function assert(label: string, condition: boolean) {
  const icon = condition ? '✓' : '✗'
  console.log(`${icon}  ${label}`)
  if (!condition) process.exitCode = 1
}

// ─── 1. mergeIntervals ───────────────────────────────────────────────────────

section('1. mergeIntervals')

{
  // Overlapping pair
  const result = mergeIntervals([
    { start: ms('09:00'), end: ms('10:00') },
    { start: ms('09:30'), end: ms('11:00') },
  ])
  assert('Two overlapping → one merged [09:00–11:00]',
    result.length === 1 &&
    result[0].start === ms('09:00') &&
    result[0].end   === ms('11:00')
  )
}

{
  // Adjacent (touching, no gap)
  const result = mergeIntervals([
    { start: ms('10:00'), end: ms('11:00') },
    { start: ms('11:00'), end: ms('12:00') },
  ])
  assert('Adjacent intervals → merged [10:00–12:00]',
    result.length === 1 &&
    result[0].end === ms('12:00')
  )
}

{
  // Three separate intervals, unsorted input
  const result = mergeIntervals([
    { start: ms('14:00'), end: ms('15:00') },
    { start: ms('09:00'), end: ms('10:00') },
    { start: ms('11:00'), end: ms('12:00') },
  ])
  assert('Three separate (unsorted) → stays 3 sorted',
    result.length === 3 &&
    result[0].start === ms('09:00')
  )
}

{
  // One fully contains another
  const result = mergeIntervals([
    { start: ms('09:00'), end: ms('18:00') },
    { start: ms('11:00'), end: ms('13:00') },
  ])
  assert('Contained interval absorbed → single [09:00–18:00]',
    result.length === 1 &&
    result[0].end === ms('18:00')
  )
}

// ─── 2. subtractIntervals ────────────────────────────────────────────────────

section('2. subtractIntervals')

{
  const window = { dayStart: ms('09:00'), dayEnd: ms('18:00') }
  const busy: TimeRange[] = [
    { start: ms('10:00'), end: ms('11:00') },
    { start: ms('13:00'), end: ms('14:30') },
  ]
  const free = subtractIntervals(window, busy)
  assert('Free windows around two bookings → 3 windows',
    free.length === 3 &&
    free[0].start === ms('09:00') && free[0].end === ms('10:00') &&
    free[1].start === ms('11:00') && free[1].end === ms('13:00') &&
    free[2].start === ms('14:30') && free[2].end === ms('18:00')
  )
}

{
  // Busy covers entire window
  const window = { dayStart: ms('09:00'), dayEnd: ms('18:00') }
  const busy: TimeRange[] = [{ start: ms('08:00'), end: ms('19:00') }]
  const free = subtractIntervals(window, busy)
  assert('All-day block → no free windows', free.length === 0)
}

{
  // Busy starts before window, partially overlaps start
  const window = { dayStart: ms('09:00'), dayEnd: ms('18:00') }
  const busy: TimeRange[] = [{ start: ms('08:00'), end: ms('10:00') }]
  const free = subtractIntervals(window, busy)
  assert('Block clips opening → free from 10:00',
    free.length === 1 && free[0].start === ms('10:00')
  )
}

// ─── 3. overlapsAny ──────────────────────────────────────────────────────────

section('3. overlapsAny')

{
  const busy = mergeIntervals([
    { start: ms('10:00'), end: ms('11:00') },
    { start: ms('13:00'), end: ms('14:00') },
  ])
  assert('Exact overlap detected',
    overlapsAny({ start: ms('10:00'), end: ms('10:30') }, busy)
  )
  assert('Touching start (not overlapping)',
    !overlapsAny({ start: ms('11:00'), end: ms('12:00') }, busy)
  )
  assert('Touching end (not overlapping)',
    !overlapsAny({ start: ms('09:00'), end: ms('10:00') }, busy)
  )
  assert('Fully inside busy block → overlap',
    overlapsAny({ start: ms('13:15'), end: ms('13:45') }, busy)
  )
}

// ─── 4. computeTotalDuration ─────────────────────────────────────────────────

section('4. computeTotalDuration')

assert('Haircut (30) + beard (20) + treatment (10) = 60 min',
  computeTotalDuration(30, [20, 10]) === 60
)
assert('Service only, no extras = service duration',
  computeTotalDuration(45, []) === 45
)
assert('Extra with duration=0 (price-only) does not add time',
  computeTotalDuration(30, [0, 15]) === 45
)

// ─── 5. computeAvailableSlots — happy path ───────────────────────────────────

section('5. computeAvailableSlots — happy path')

{
  // Barber works 09:00–12:00, no bookings
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('12:00') },
    busyIntervals: [],
    durationMinutes: 30,
    granularityMinutes: 30,
  })
  console.log('Open 09:00–12:00, 30-min service, 30-min granularity:')
  console.log(fmtSlots(slots))
  assert('6 slots: 09:00 10:00 11:00 and half-hours', slots.length === 6)
  assert('First slot at 09:00', fmt(slots[0].startTime) === '09:00')
  assert('Last slot ends at 12:00', fmt(slots[slots.length - 1].endTime) === '12:00')
}

{
  // 15-min granularity, 45-min service, 9h window
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('18:00') },
    busyIntervals: [],
    durationMinutes: 45,
    granularityMinutes: 15,
  })
  // 09:00–17:15 is the last valid start (17:15 + 45 = 18:00)
  // Candidates: 09:00, 09:15, ..., 17:15 → (8h15m / 15min) + 1 = 34 slots
  assert('45-min service in 9h open day → 34 slots', slots.length === 34)
  assert('Last valid start is 17:15', fmt(slots[slots.length - 1].startTime) === '17:15')
}

// ─── 6. computeAvailableSlots — with bookings ────────────────────────────────

section('6. computeAvailableSlots — with bookings')

{
  /**
   * Timeline (30-min service, 30-min granularity):
   *
   *  09:00 ──── 10:00 ──── 11:00 ──── 12:00
   *  [  free  ] [booking ] [  free  ]
   *
   * Valid slots: 09:00, 11:00, (11:30 would end at 12:00 — valid too)
   */
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('12:00') },
    busyIntervals: [{ start: ms('10:00'), end: ms('11:00') }],
    durationMinutes: 30,
    granularityMinutes: 30,
  })
  console.log('\nBooking 10:00–11:00, 30-min service, 30-min gran:')
  console.log(fmtSlots(slots))
  assert('4 slots (09:00, 09:30, 11:00, 11:30)', slots.length === 4)
  assert('09:30 slot exists', slots.some((s) => fmt(s.startTime) === '09:30'))
  assert('10:00 slot absent', !slots.some((s) => fmt(s.startTime) === '10:00'))
  assert('10:30 slot absent', !slots.some((s) => fmt(s.startTime) === '10:30'))
}

{
  /**
   * Partial slot at end — service longer than remaining free window.
   *
   * Window: 09:00–10:00 (1h)
   * Booking: 09:30–10:00
   * Duration: 45 min
   *
   * Candidate 09:00 → ends 09:45 → overlaps booking at 09:30 → skip
   * Candidate 09:15 → ends 10:00 → overlaps booking at 09:30 → skip
   * Result: [] — no room
   */
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('10:00') },
    busyIntervals: [{ start: ms('09:30'), end: ms('10:00') }],
    durationMinutes: 45,
    granularityMinutes: 15,
  })
  assert('No room for 45-min service when booking fills end of 1h window', slots.length === 0)
}

// ─── 7. computeAvailableSlots — overlapping/adjacent busy blocks ──────────────

section('7. Overlapping / adjacent busy blocks')

{
  /**
   * Two overlapping blocked times that need merging before slot computation.
   *
   * Block A: 10:00–11:30
   * Block B: 11:00–12:30  (overlaps A by 30 min)
   * Merged:  10:00–12:30
   *
   * Window: 09:00–14:00, 30-min service, 30-min gran
   * Free after merge: [09:00–10:00], [12:30–14:00]
   */
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('14:00') },
    busyIntervals: [
      { start: ms('10:00'), end: ms('11:30') },
      { start: ms('11:00'), end: ms('12:30') }, // overlaps previous
    ],
    durationMinutes: 30,
    granularityMinutes: 30,
  })
  console.log('\nOverlapping blocks 10:00–11:30 and 11:00–12:30 (merged to 10:00–12:30):')
  console.log(fmtSlots(slots))
  assert('Slots only in [09:00–10:00] and [12:30–14:00]',
    slots.every((s) => fmt(s.startTime) < '10:00' || fmt(s.startTime) >= '12:30')
  )
  assert('10:00 start not offered', !slots.some((s) => fmt(s.startTime) === '10:00'))
  assert('12:30 start offered',      slots.some((s) => fmt(s.startTime) === '12:30'))
}

{
  // Three adjacent bookings — should behave like one long block
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('18:00') },
    busyIntervals: [
      { start: ms('09:00'), end: ms('11:00') },
      { start: ms('11:00'), end: ms('13:00') },
      { start: ms('13:00'), end: ms('15:00') },
    ],
    durationMinutes: 30,
    granularityMinutes: 30,
  })
  assert('Adjacent bookings block 09:00–15:00; slots only 15:00+',
    slots.every((s) => fmt(s.startTime) >= '15:00')
  )
}

// ─── 8. computeAvailableSlots — closed day ────────────────────────────────────

section('8. Closed day')

{
  // dayStart === dayEnd (degenerate window)
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('09:00') },
    busyIntervals: [],
    durationMinutes: 30,
  })
  assert('Zero-length working window → no slots', slots.length === 0)
}

{
  // Service duration equals entire window, zero free time
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('09:30') },
    busyIntervals: [],
    durationMinutes: 60,
  })
  assert('Duration > window → no slots', slots.length === 0)
}

{
  // Service fills window exactly — one slot only
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('10:00') },
    busyIntervals: [],
    durationMinutes: 60,
    granularityMinutes: 60,
  })
  assert('60-min service in 60-min window → exactly 1 slot', slots.length === 1)
}

// ─── 9. computeAvailableSlots — today's past slots ────────────────────────────

section('9. notBefore (past slots excluded for today)')

{
  /**
   * Simulate: it's currently 10:05 on the target day.
   * Window: 09:00–12:00, 30-min service, 30-min granularity.
   *
   * Candidates before alignment: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
   * notBefore = 10:05  →  next boundary at or after 10:05 is 10:30
   * Valid:     10:30, 11:00, 11:30
   */
  const now = ms('10:05')
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('12:00') },
    busyIntervals: [],
    durationMinutes: 30,
    granularityMinutes: 30,
    notBefore: now,
  })
  console.log('\nnow=10:05, open 09:00–12:00, 30-min service:')
  console.log(fmtSlots(slots))
  assert('3 slots remaining after 10:05 (10:30, 11:00, 11:30)', slots.length === 3)
  assert('First available is 10:30', fmt(slots[0].startTime) === '10:30')
}

{
  // notBefore is after closing → no slots
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('12:00') },
    busyIntervals: [],
    durationMinutes: 30,
    notBefore: ms('12:00'),
  })
  assert('notBefore at closing → no slots', slots.length === 0)
}

// ─── 10. Full realistic example ───────────────────────────────────────────────

section('10. Full realistic example')

{
  /**
   * Barber João, Monday 2024-01-15
   *
   * Working hours: 09:00 – 18:00
   *
   * Existing bookings:
   *   A) 09:00 – 09:30  (haircut)
   *   B) 10:30 – 11:15  (haircut + beard)
   *   C) 14:00 – 15:00  (full treatment)
   *
   * Blocked time (lunch break): 12:00 – 13:00
   *
   * Requested: haircut (30 min) + beard trim (20 min) = 50 min total
   * Granularity: 15 min
   *
   * Expected free windows after merging busy:
   *   [09:30–10:30], [11:15–12:00], [13:00–14:00], [15:00–18:00]
   *
   * Valid slot starts (end must be within window):
   *   09:30 → 10:20 ✓   09:45 → 10:35 ✗ (overlaps 10:30 booking)
   *   11:15 → 12:05 ✗   (only 45 min free — 12:05 > 12:00)
   *   13:00 → 13:50 ✓   13:15 → 14:05 ✗ (overlaps 14:00 booking)
   *   15:00 → 15:50 ✓   15:15 → 16:05 ✓ … until 17:00 → 17:50 ✓
   *   17:10 never generated (not on 15-min boundary from 09:00)
   *   17:15 → 18:05 ✗   (exceeds 18:00)
   */
  const duration = computeTotalDuration(30, [20]) // 50 min
  const slots = computeAvailableSlots({
    workingWindow: { dayStart: ms('09:00'), dayEnd: ms('18:00') },
    busyIntervals: [
      { start: ms('09:00'), end: ms('09:30') },  // booking A
      { start: ms('10:30'), end: ms('11:15') },  // booking B
      { start: ms('12:00'), end: ms('13:00') },  // lunch block
      { start: ms('14:00'), end: ms('15:00') },  // booking C
    ],
    durationMinutes: duration,
    granularityMinutes: 15,
  })

  console.log(`\nService+extras = ${duration} min, 15-min granularity:`)
  console.log(fmtSlots(slots))

  assert('09:30 slot valid (ends 10:20, before 10:30 booking)',
    slots.some((s) => fmt(s.startTime) === '09:30')
  )
  assert('09:45 slot absent (would end 10:35, overlaps 10:30 booking)',
    !slots.some((s) => fmt(s.startTime) === '09:45')
  )
  assert('11:15 slot absent (only 45 min until 12:00, need 50)',
    !slots.some((s) => fmt(s.startTime) === '11:15')
  )
  assert('13:00 slot valid (ends 13:50, before 14:00 booking)',
    slots.some((s) => fmt(s.startTime) === '13:00')
  )
  assert('13:15 slot absent (would end 14:05, overlaps 14:00 booking)',
    !slots.some((s) => fmt(s.startTime) === '13:15')
  )
  assert('15:00 slot valid', slots.some((s) => fmt(s.startTime) === '15:00'))
  assert('17:00 slot valid (ends 17:50, last valid start)',
    slots.some((s) => fmt(s.startTime) === '17:00')
  )
  assert('17:15 slot absent (would end 18:05 > 18:00)',
    !slots.some((s) => fmt(s.startTime) === '17:15')
  )
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60))
if (process.exitCode === 1) {
  console.log('  Some assertions FAILED.')
} else {
  console.log('  All assertions passed.')
}
console.log('─'.repeat(60) + '\n')
