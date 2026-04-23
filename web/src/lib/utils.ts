import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface VerticalWheelEventLike {
  deltaX: number
  deltaY: number
  preventDefault: () => void
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

export function toWallClockDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value

  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  )
}

export function findScrollableParent(element: HTMLElement | null) {
  let current = element?.parentElement ?? null

  while (current) {
    const style = window.getComputedStyle(current)
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY)

    if (canScrollY && current.scrollHeight > current.clientHeight) return current
    current = current.parentElement
  }

  return document.scrollingElement as HTMLElement | null
}

export function redirectVerticalWheelToParent(event: VerticalWheelEventLike, element: HTMLElement | null) {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

  const scrollParent = findScrollableParent(element)
  if (!scrollParent) return

  scrollParent.scrollBy({ top: event.deltaY })
  event.preventDefault()
}
