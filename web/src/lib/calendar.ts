type CalendarEventInput = {
  description?: string
  endTime: string | Date
  location?: string
  startTime: string | Date
  title: string
}

type CalendarPlatform = 'android' | 'ios' | 'other'

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value)
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatUtcDate(date: Date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('')
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function encodeGoogleDate(date: Date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('')
}

export function detectCalendarPlatform(userAgent = navigator.userAgent) {
  const normalized = userAgent.toLowerCase()

  if (/android/.test(normalized)) return 'android' satisfies CalendarPlatform
  if (/iphone|ipad|ipod/.test(normalized)) return 'ios' satisfies CalendarPlatform
  return 'other' satisfies CalendarPlatform
}

export function buildGoogleCalendarUrl(input: CalendarEventInput) {
  const startDate = toDate(input.startTime)
  const endDate = toDate(input.endTime)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${encodeGoogleDate(startDate)}/${encodeGoogleDate(endDate)}`,
  })

  if (input.description) params.set('details', input.description)
  if (input.location) params.set('location', input.location)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildIcsContent(input: CalendarEventInput) {
  const startDate = toDate(input.startTime)
  const endDate = toDate(input.endTime)
  const stamp = formatUtcDate(new Date())
  const uid = `trimio-${startDate.getTime()}-${Math.random().toString(36).slice(2)}@trimio`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trimio//Booking//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatUtcDate(startDate)}`,
    `DTEND:${formatUtcDate(endDate)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${escapeIcsText(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcsFile(input: CalendarEventInput, fileName = 'reserva.ics') {
  const blob = new Blob([buildIcsContent(input)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.click()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
