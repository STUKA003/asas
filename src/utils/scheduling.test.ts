import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeAvailableSlots,
  computeTotalDuration,
  isSlotAlignedToWindowStart,
  mergeIntervals,
  overlapsAny,
  parseTimeStringToEpoch,
  subtractIntervals,
  type TimeRange,
} from './scheduling'

function buildDate(hour: number, minute = 0) {
  const date = new Date('2026-04-17T00:00:00.000Z')
  date.setUTCHours(hour, minute, 0, 0)
  return date
}

test('mergeIntervals merges overlapping and adjacent intervals', () => {
  const intervals: TimeRange[] = [
    { start: buildDate(9).getTime(), end: buildDate(10).getTime() },
    { start: buildDate(9, 30).getTime(), end: buildDate(11).getTime() },
    { start: buildDate(12).getTime(), end: buildDate(13).getTime() },
    { start: buildDate(13).getTime(), end: buildDate(14).getTime() },
  ]

  assert.deepEqual(mergeIntervals(intervals), [
    { start: buildDate(9).getTime(), end: buildDate(11).getTime() },
    { start: buildDate(12).getTime(), end: buildDate(14).getTime() },
  ])
})

test('overlapsAny only returns true when slot overlaps merged busy intervals', () => {
  const merged = [
    { start: buildDate(10).getTime(), end: buildDate(11).getTime() },
    { start: buildDate(13).getTime(), end: buildDate(14).getTime() },
  ]

  assert.equal(
    overlapsAny({ start: buildDate(9).getTime(), end: buildDate(10).getTime() }, merged),
    false
  )
  assert.equal(
    overlapsAny({ start: buildDate(10, 15).getTime(), end: buildDate(10, 45).getTime() }, merged),
    true
  )
})

test('subtractIntervals returns free windows inside working window', () => {
  const free = subtractIntervals(
    { dayStart: buildDate(9).getTime(), dayEnd: buildDate(18).getTime() },
    [
      { start: buildDate(10).getTime(), end: buildDate(11).getTime() },
      { start: buildDate(13).getTime(), end: buildDate(14, 30).getTime() },
    ]
  )

  assert.deepEqual(free, [
    { start: buildDate(9).getTime(), end: buildDate(10).getTime() },
    { start: buildDate(11).getTime(), end: buildDate(13).getTime() },
    { start: buildDate(14, 30).getTime(), end: buildDate(18).getTime() },
  ])
})

test('computeTotalDuration sums service and extras', () => {
  assert.equal(computeTotalDuration(30, [5, 10, 0]), 45)
})

test('parseTimeStringToEpoch parses HH:MM against base date', () => {
  const epoch = parseTimeStringToEpoch('14:30', new Date('2026-04-17T00:00:00.000Z'))
  const parsed = new Date(epoch)
  assert.equal(parsed.getHours(), 14)
  assert.equal(parsed.getMinutes(), 30)
})

test('computeAvailableSlots skips busy intervals and respects granularity', () => {
  const slots = computeAvailableSlots({
    workingWindow: {
      dayStart: buildDate(9).getTime(),
      dayEnd: buildDate(12).getTime(),
    },
    busyIntervals: [
      { start: buildDate(10).getTime(), end: buildDate(10, 30).getTime() },
    ],
    durationMinutes: 30,
    granularityMinutes: 30,
  })

  assert.deepEqual(
    slots.map((slot) => slot.startTime.toISOString()),
    [
      buildDate(9).toISOString(),
      buildDate(9, 30).toISOString(),
      buildDate(10, 30).toISOString(),
      buildDate(11).toISOString(),
      buildDate(11, 30).toISOString(),
    ]
  )
})

test('computeAvailableSlots respects notBefore and duration fit', () => {
  const slots = computeAvailableSlots({
    workingWindow: {
      dayStart: buildDate(9).getTime(),
      dayEnd: buildDate(10).getTime(),
    },
    busyIntervals: [],
    durationMinutes: 30,
    granularityMinutes: 15,
    notBefore: buildDate(9, 20).getTime(),
  })

  assert.deepEqual(
    slots.map((slot) => slot.startTime.toISOString()),
    [buildDate(9, 30).toISOString()]
  )
})

test('isSlotAlignedToWindowStart respects the configured grid', () => {
  const windowStart = buildDate(9).getTime()

  assert.equal(isSlotAlignedToWindowStart(windowStart, buildDate(9).getTime(), 15), true)
  assert.equal(isSlotAlignedToWindowStart(windowStart, buildDate(9, 15).getTime(), 15), true)
  assert.equal(isSlotAlignedToWindowStart(windowStart, buildDate(9, 7).getTime(), 15), false)
  assert.equal(isSlotAlignedToWindowStart(buildDate(9, 10).getTime(), buildDate(9, 40).getTime(), 15), true)
})
