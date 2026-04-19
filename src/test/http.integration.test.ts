import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import http from 'node:http'
import bcrypt from 'bcryptjs'
import path from 'node:path'

const workspaceRoot = path.resolve(__dirname, '../..')
const testDatabaseUrl = process.env.TEST_DATABASE_URL
const integrationEnabled = Boolean(testDatabaseUrl)
const schemaName = `itest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

if (integrationEnabled) {
  const databaseUrl = new URL(testDatabaseUrl as string)
  databaseUrl.searchParams.set('schema', schemaName)

  process.env.DATABASE_URL = databaseUrl.toString()
  process.env.JWT_SECRET = 'integration-secret'
  process.env.JWT_EXPIRES_IN = '7d'
  process.env.NODE_ENV = 'test'

  execFileSync(
    'npx',
    ['prisma', 'db', 'push', '--skip-generate'],
    {
      cwd: workspaceRoot,
      env: process.env,
      stdio: 'ignore',
    }
  )
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = integrationEnabled
  ? (require('../lib/prisma') as typeof import('../lib/prisma'))
  : { prisma: null as unknown as typeof import('../lib/prisma')['prisma'] }
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = integrationEnabled
  ? (require('../app') as typeof import('../app')).default
  : null

let server: http.Server
let baseUrl = ''

async function startServer() {
  if (!app) throw new Error('Integration app is not configured')
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Failed to start test server')
      baseUrl = `http://127.0.0.1:${address.port}`
      resolve()
    })
  })
}

async function stopServer() {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function resetDatabase() {
  if (!prisma) return
  await prisma.notification.deleteMany()
  await prisma.bookingProduct.deleteMany()
  await prisma.bookingExtra.deleteMany()
  await prisma.bookingService.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.blockedTime.deleteMany()
  await prisma.workingHours.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.planService.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.product.deleteMany()
  await prisma.extra.deleteMany()
  await prisma.service.deleteMany()
  await prisma.barber.deleteMany()
  await prisma.user.deleteMany()
  await prisma.barbershop.deleteMany()
}

async function jsonRequest(pathname: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  return { response, body }
}

test.before(async () => {
  if (!integrationEnabled || !app) return
  await startServer()
})

test.after(async () => {
  if (!integrationEnabled || !prisma) return
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
  await prisma.$disconnect()
  await stopServer()
})

test.beforeEach(async () => {
  if (!integrationEnabled) return
  await resetDatabase()
})

test('admin login and customer CRUD flow works end-to-end', { skip: !integrationEnabled }, async () => {
  const password = 'segredo123'
  const hashedPassword = await bcrypt.hash(password, 10)

  const shop = await prisma.barbershop.create({
    data: {
      name: 'Studio Fade',
      slug: 'studio-fade',
      users: {
        create: {
          name: 'Admin',
          email: 'admin@studiofade.test',
          password: hashedPassword,
          role: 'OWNER',
        },
      },
    },
  })

  const login = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      slug: shop.slug,
      email: 'admin@studiofade.test',
      password,
    }),
  })

  assert.equal(login.response.status, 200)
  assert.ok(login.body.token)

  const createCustomer = await jsonRequest('/api/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.body.token}` },
    body: JSON.stringify({
      name: 'Leandro Gomes',
      phone: '912345678',
      email: 'leandro@example.com',
    }),
  })

  assert.equal(createCustomer.response.status, 201)
  assert.equal(createCustomer.body.name, 'Leandro Gomes')

  const updateCustomer = await jsonRequest(`/api/customers/${createCustomer.body.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${login.body.token}` },
    body: JSON.stringify({
      name: 'Leandro G.',
      email: 'novo@example.com',
      notes: 'Cliente fiel',
    }),
  })

  assert.equal(updateCustomer.response.status, 200)
  assert.equal(updateCustomer.body.name, 'Leandro G.')

  const listCustomers = await jsonRequest('/api/customers?q=Leandro', {
    headers: { Authorization: `Bearer ${login.body.token}` },
  })

  assert.equal(listCustomers.response.status, 200)
  assert.equal(listCustomers.body.length, 1)
  assert.equal(listCustomers.body[0].email, 'novo@example.com')
})

test('public availability and booking flow works end-to-end', { skip: !integrationEnabled }, async () => {
  const bookingDate = new Date(2026, 3, 20, 9, 0, 0, 0)
  const dateParam = bookingDate.toISOString().slice(0, 10)

  const shop = await prisma.barbershop.create({
    data: {
      name: 'Barber Prime',
      slug: 'barber-prime',
      slotGranularityMinutes: 15,
    },
  })

  const barber = await prisma.barber.create({
    data: {
      name: 'Miguel',
      barbershopId: shop.id,
      active: true,
    },
  })

  const service = await prisma.service.create({
    data: {
      name: 'Corte',
      price: 15,
      duration: 30,
      active: true,
      barbershopId: shop.id,
    },
  })

  await prisma.workingHours.create({
    data: {
      dayOfWeek: bookingDate.getDay(),
      startTime: '09:00',
      endTime: '12:00',
      active: true,
      barberId: barber.id,
      barbershopId: shop.id,
    },
  })

  const availability = await jsonRequest(`/api/public/${shop.slug}/availability?barberId=${barber.id}&date=${dateParam}&duration=30`)
  assert.equal(availability.response.status, 200)
  assert.ok(Array.isArray(availability.body.slots))
  assert.ok(availability.body.slots.length > 0)

  const booking = await jsonRequest(`/api/public/${shop.slug}/bookings`, {
    method: 'POST',
    body: JSON.stringify({
      barberId: barber.id,
      serviceIds: [service.id],
      startTime: bookingDate.toISOString(),
      customer: {
        name: 'Cliente Público',
        phone: '919999999',
        email: 'cliente@publico.test',
      },
    }),
  })

  assert.equal(booking.response.status, 201)
  assert.equal(booking.body.barber.id, barber.id)
  assert.equal(booking.body.customer.name, 'Cliente Público')

  const overlappingBooking = await jsonRequest(`/api/public/${shop.slug}/bookings`, {
    method: 'POST',
    body: JSON.stringify({
      barberId: barber.id,
      serviceIds: [service.id],
      startTime: bookingDate.toISOString(),
      customer: {
        name: 'Outro Cliente',
        phone: '918888888',
        email: 'outro@publico.test',
      },
    }),
  })

  assert.equal(overlappingBooking.response.status, 422)
  assert.match(overlappingBooking.body.error, /already has a booking|Time slot/)
})
