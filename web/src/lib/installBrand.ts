import { useEffect } from 'react'

type InstallBrandId = 'admin' | 'barber' | 'superadmin'

const BRANDS: Record<InstallBrandId, { title: string; shortTitle: string; bg: string; fg: string; glyph: string; theme: string }> = {
  admin: {
    title: 'Trimio Studio',
    shortTitle: 'Studio',
    bg: '#09090b',
    fg: '#ffffff',
    glyph: 'TS',
    theme: '#09090b',
  },
  barber: {
    title: 'Trimio Flow',
    shortTitle: 'Flow',
    bg: '#f97316',
    fg: '#ffffff',
    glyph: 'TF',
    theme: '#f97316',
  },
  superadmin: {
    title: 'Trimio Command',
    shortTitle: 'Command',
    bg: '#0f172a',
    fg: '#7dd3fc',
    glyph: 'TC',
    theme: '#0f172a',
  },
}

function ensureMeta(name: string) {
  let element = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.appendChild(element)
  }
  return element
}

function ensureLink(rel: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  return element
}

function buildIconDataUrl(brand: typeof BRANDS[InstallBrandId]) {
  const canvas = document.createElement('canvas')
  canvas.width = 180
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = brand.bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.arc(142, 40, 34, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = brand.fg
  ctx.font = '700 72px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(brand.glyph, canvas.width / 2, canvas.height / 2 + 4)

  return canvas.toDataURL('image/png')
}

export function applyInstallBrand(id: InstallBrandId) {
  const brand = BRANDS[id]
  document.title = brand.title
  ensureMeta('apple-mobile-web-app-title').content = brand.title
  ensureMeta('application-name').content = brand.title
  ensureMeta('theme-color').content = brand.theme

  const iconUrl = buildIconDataUrl(brand)
  if (iconUrl) {
    ensureLink('apple-touch-icon').href = iconUrl
    ensureLink('icon').href = iconUrl
  }
}

export function useInstallBrand(id: InstallBrandId) {
  useEffect(() => {
    applyInstallBrand(id)
  }, [id])
}
