function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatStoredWallClockTime(date: Date) {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}
