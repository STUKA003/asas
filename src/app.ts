import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import fs from 'fs'
import path from 'path'
import { authenticate } from './middlewares/auth'
import { prisma } from './lib/prisma'

import authRouter from './modules/auth/router'
import publicRouter from './modules/public/router'
import barbershopsRouter from './modules/barbershops/router'
import barbersRouter from './modules/barbers/router'
import servicesRouter from './modules/services/router'
import extrasRouter from './modules/extras/router'
import productsRouter from './modules/products/router'
import plansRouter from './modules/plans/router'
import customersRouter from './modules/customers/router'
import bookingsRouter from './modules/bookings/router'
import workingHoursRouter from './modules/working-hours/router'
import blockedTimesRouter from './modules/blocked-times/router'
import superadminRouter from './modules/superadmin/router'
import barberAuthRouter from './modules/barber-auth/router'
import barberPortalRouter from './modules/barber-portal/router'
import notificationsRouter from './modules/notifications/router'
import pushRouter from './modules/push/router'
import { handleStripeWebhook } from './modules/stripe/controller'

const app = express()

// Production runs behind Nginx, so Express must trust the first proxy hop
// to interpret client IPs and forwarded headers correctly.
app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)
app.use(express.json({ limit: '15mb' }))

app.get('/install-manifest.webmanifest', (req, res) => {
  const surface = typeof req.query.surface === 'string' ? req.query.surface : 'platform'
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''

  const iconPathBySurface = {
    platform: '/branding/platform-logo.png',
    admin: '/branding/admin-logo.png',
    superadmin: '/branding/superadmin-logo.png',
    barber: '/branding/barber-logo.png',
    clients: '/branding/clients-logo.png',
  } as const

  const brandBySurface = {
    platform: { name: 'Trimio', shortName: 'Trimio', theme: '#09090b', background: '#ffffff', id: '/', startUrl: '/', scope: '/' },
    admin: { name: 'Trimio Studio', shortName: 'Studio', theme: '#09090b', background: '#09090b', id: '/admin', startUrl: '/admin', scope: '/admin' },
    superadmin: { name: 'Trimio Command', shortName: 'Command', theme: '#0f172a', background: '#0f172a', id: '/superadmin', startUrl: '/superadmin', scope: '/superadmin' },
  } as const

  const normalizedSurface: 'platform' | 'admin' | 'superadmin' | 'barber' | 'clients' =
    surface === 'admin' || surface === 'superadmin' || surface === 'barber' || surface === 'clients'
      ? surface
      : 'platform'

  let manifest: {
    name: string
    short_name: string
    id: string
    start_url: string
    scope: string
    display: string
    background_color: string
    theme_color: string
    icons: Array<{ src: string; sizes: string; type: string; purpose: string }>
  }

  if (normalizedSurface === 'barber' && slug) {
    manifest = {
      name: 'Trimio Flow',
      short_name: 'Flow',
      id: `/${slug}/barber`,
      start_url: `/${slug}/barber`,
      scope: `/${slug}/barber`,
      display: 'standalone',
      background_color: '#f97316',
      theme_color: '#f97316',
      icons: [],
    }
  } else if (normalizedSurface === 'barber') {
    manifest = {
      name: 'Trimio Flow',
      short_name: 'Flow',
      id: '/barber/login',
      start_url: '/barber/login',
      scope: '/barber',
      display: 'standalone',
      background_color: '#f97316',
      theme_color: '#f97316',
      icons: [],
    }
  } else if (normalizedSurface === 'clients' && slug) {
    manifest = {
      name: 'Trimio Clientes',
      short_name: 'Clientes',
      id: `/${slug}`,
      start_url: `/${slug}`,
      scope: `/${slug}`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#09090b',
      icons: [],
    }
  } else {
    const fallbackKey: 'platform' | 'admin' | 'superadmin' =
      normalizedSurface === 'admin' || normalizedSurface === 'superadmin'
        ? normalizedSurface
        : 'platform'
    const fallback = brandBySurface[fallbackKey]
    manifest = {
      name: fallback.name,
      short_name: fallback.shortName,
      id: fallback.id,
      start_url: fallback.startUrl,
      scope: fallback.scope,
      display: 'standalone',
      background_color: fallback.background,
      theme_color: fallback.theme,
      icons: [],
    }
  }

  const iconPath = iconPathBySurface[normalizedSurface]
  manifest.icons = [
    { src: iconPath, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    { src: iconPath, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
  ]

  res.type('application/manifest+json')
  res.setHeader('Cache-Control', 'no-store')
  res.send(JSON.stringify(manifest))
})

app.use('/api/auth', authRouter)
app.use('/api/public/:slug', publicRouter) // no auth — tenant identified by slug

app.use('/api/barbershop', authenticate, barbershopsRouter)
app.use('/api/barbers', authenticate, barbersRouter)
app.use('/api/services', authenticate, servicesRouter)
app.use('/api/extras', authenticate, extrasRouter)
app.use('/api/products', authenticate, productsRouter)
app.use('/api/plans', authenticate, plansRouter)
app.use('/api/customers', authenticate, customersRouter)
app.use('/api/bookings', authenticate, bookingsRouter)
app.use('/api/working-hours', authenticate, workingHoursRouter)
app.use('/api/blocked-times', authenticate, blockedTimesRouter)
app.use('/api/superadmin', superadminRouter)
app.use('/api/barber-auth', barberAuthRouter)
app.use('/api/barber-portal', barberPortalRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/push', pushRouter)

/* ─── SEO routes ─────────────────────────────────────────────── */

const BASE_URL = 'https://trimio.pt'
const RESERVED = new Set(['api', 'admin', 'superadmin', 'register', 'verify-email', 'barber', 'install-manifest'])

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function readIndexHtml(): string {
  const p = path.resolve(__dirname, '..', 'web', 'dist', 'index.html')
  return fs.readFileSync(p, 'utf-8')
}

// Sitemap — lists all barbershop pages for Google to crawl
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const shops = await prisma.barbershop.findMany({
      where: { suspended: false },
      select: { slug: true, updatedAt: true },
    })
    const now = new Date().toISOString().split('T')[0]
    const urls: { loc: string; priority: string; lastmod?: string }[] = [
      { loc: `${BASE_URL}/`,        priority: '1.0', lastmod: now },
      { loc: `${BASE_URL}/register`, priority: '0.8' },
      ...shops.flatMap((s) => {
        const mod = s.updatedAt.toISOString().split('T')[0]
        return [
          { loc: `${BASE_URL}/${s.slug}`,          priority: '0.8', lastmod: mod },
          { loc: `${BASE_URL}/${s.slug}/booking`,  priority: '0.9', lastmod: mod },
          { loc: `${BASE_URL}/${s.slug}/services`, priority: '0.6', lastmod: mod },
        ]
      }),
    ]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      urls.map(({ loc, priority, lastmod }) =>
        `  <url>\n    <loc>${loc}</loc>\n    <priority>${priority}</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`
      ).join('\n')
    }\n</urlset>`
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(xml)
  } catch {
    res.status(500).send('Error generating sitemap')
  }
})

// Robots.txt — explicit sitemap reference
app.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /superadmin/\nDisallow: /api/\nSitemap: ${BASE_URL}/sitemap.xml\n`)
})

// Barbershop pages — inject SEO meta tags before the SPA renders
app.get('/:slug', async (req, res, next) => {
  const { slug } = req.params
  if (RESERVED.has(slug) || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) return next()
  try {
    const shop = await prisma.barbershop.findUnique({
      where: { slug },
      select: { name: true, slug: true, address: true, suspended: true },
    })
    if (!shop || shop.suspended) return next()

    const title  = `${shop.name} — Agendamento Online`
    const desc   = `Marca o teu corte em ${shop.name}${shop.address ? ` em ${shop.address}` : ''}. Agendamento online rápido, sem chamadas nem WhatsApp.`
    const url    = `${BASE_URL}/${slug}`
    const ld     = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      name: shop.name,
      url,
      ...(shop.address ? { address: { '@type': 'PostalAddress', addressLocality: shop.address } } : {}),
      potentialAction: { '@type': 'ReserveAction', target: `${url}/booking`, name: 'Agendar corte' },
    })

    const inject = [
      `<title>${escHtml(title)}</title>`,
      `<meta name="description" content="${escHtml(desc)}" />`,
      `<meta property="og:title" content="${escHtml(title)}" />`,
      `<meta property="og:description" content="${escHtml(desc)}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta name="twitter:card" content="summary" />`,
      `<link rel="canonical" href="${url}" />`,
      `<script type="application/ld+json">${ld}</script>`,
    ].join('\n    ')

    const html = readIndexHtml().replace(
      /<title>.*?<\/title>/,
      inject
    )
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
    res.send(html)
  } catch {
    next()
  }
})

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (process.env.NODE_ENV !== 'production') console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
