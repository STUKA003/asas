import { useEffect } from 'react'

type InstallBrandId = 'admin' | 'barber' | 'superadmin' | 'clients' | 'platform'

type InstallBrand = {
  title: string
  shortTitle: string
  theme: string
  background: string
  iconPath: string
}

const BRANDS: Record<InstallBrandId, InstallBrand> = {
  admin: {
    title: 'Trimio Studio',
    shortTitle: 'Studio',
    theme: '#09090b',
    background: '#09090b',
    iconPath: '/branding/admin-logo.png',
  },
  barber: {
    title: 'Trimio Flow',
    shortTitle: 'Flow',
    theme: '#f97316',
    background: '#f97316',
    iconPath: '/branding/barber-logo.png',
  },
  superadmin: {
    title: 'Trimio Command',
    shortTitle: 'Command',
    theme: '#0f172a',
    background: '#0f172a',
    iconPath: '/branding/superadmin-logo.png',
  },
  clients: {
    title: 'Trimio Clientes',
    shortTitle: 'Clientes',
    theme: '#09090b',
    background: '#ffffff',
    iconPath: '/branding/clients-logo.png',
  },
  platform: {
    title: 'Trimio',
    shortTitle: 'Trimio',
    theme: '#09090b',
    background: '#ffffff',
    iconPath: '/branding/platform-logo.png',
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

function ensureManifestLink() {
  return ensureLink('manifest')
}

function normalizePath(path: string) {
  if (!path || path === '/') return '/'
  return path.startsWith('/') ? path : `/${path}`
}

function resolveBrandPaths(id: InstallBrandId, pathname: string) {
  const safePath = normalizePath(pathname)

  if (id === 'platform') {
    return { appId: '/', startUrl: '/', scope: '/' }
  }

  if (id === 'admin') {
    return { appId: '/admin', startUrl: '/admin', scope: '/admin' }
  }

  if (id === 'superadmin') {
    return { appId: '/superadmin', startUrl: '/superadmin', scope: '/superadmin' }
  }

  if (id === 'barber') {
    const match = safePath.match(/^\/([^/]+)\/barber(?:\/.*)?$/)
    const basePath = match ? `/${match[1]}/barber` : '/barber'
    return { appId: basePath, startUrl: basePath, scope: basePath }
  }

  if (id === 'clients') {
    const match = safePath.match(/^\/([^/]+)(?:\/.*)?$/)
    const reserved = new Set(['admin', 'superadmin', 'register', 'verify-email', 'barber'])
    const firstSegment = match?.[1]
    const basePath = firstSegment && !reserved.has(firstSegment) ? `/${firstSegment}` : '/'
    return { appId: basePath, startUrl: basePath, scope: basePath }
  }

  return { appId: safePath, startUrl: safePath, scope: safePath }
}

export function applyInstallBrand(id: InstallBrandId) {
  const brand = BRANDS[id]
  const pathname = window.location.pathname
  document.title = brand.title
  ensureMeta('apple-mobile-web-app-title').content = brand.title
  ensureMeta('application-name').content = brand.title
  ensureMeta('theme-color').content = brand.theme
  ensureMeta('apple-mobile-web-app-capable').content = 'yes'

  const appleTouchIcon = ensureLink('apple-touch-icon')
  appleTouchIcon.href = brand.iconPath
  appleTouchIcon.sizes = '180x180'

  const icon = ensureLink('icon')
  icon.href = brand.iconPath
  icon.type = 'image/png'

  const manifestIdentity = resolveBrandPaths(id, pathname)
  const manifestUrl = (() => {
    const manifest = {
      name: brand.title,
      short_name: brand.shortTitle,
      id: manifestIdentity.appId,
      start_url: manifestIdentity.startUrl,
      scope: manifestIdentity.scope,
      display: 'standalone',
      background_color: brand.background,
      theme_color: brand.theme,
      icons: [
        {
          src: brand.iconPath,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: brand.iconPath,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    }

    return URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }))
  })()
  const manifestLink = ensureManifestLink()
  const previousManifestUrl = manifestLink.dataset.objectUrl
  if (previousManifestUrl) URL.revokeObjectURL(previousManifestUrl)
  manifestLink.href = manifestUrl
  manifestLink.dataset.objectUrl = manifestUrl
}

export function useInstallBrand(id: InstallBrandId) {
  useEffect(() => {
    applyInstallBrand(id)
  }, [id, window.location.pathname])
}
