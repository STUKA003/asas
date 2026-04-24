function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatStoredWallClockTime(date: Date) {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export function formatStoredWallClockDayMonth(date: Date) {
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}`
}

export function formatStoredWallClockDayMonthTime(date: Date) {
  return `${formatStoredWallClockDayMonth(date)} às ${formatStoredWallClockTime(date)}`
}
