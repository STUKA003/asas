import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import http from 'node:http'
import crypto from 'node:crypto'
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
  process.env.APP_URL = 'http://127.0.0.1:3000'

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
  await prisma.authToken.deleteMany()
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
          emailVerifiedAt: new Date(),
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

test('register requires email verification before login, and verification unlocks access', { skip: !integrationEnabled }, async () => {
  const register = await jsonRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      barbershopName: 'Verify Shop',
      slug: 'verify-shop',
      name: 'Owner Verify',
      email: 'owner@verify-shop.test',
      password: 'segredo123',
    }),
  })

  assert.equal(register.response.status, 201)
  assert.equal(register.body.requiresEmailVerification, true)

  const shop = await prisma.barbershop.findUnique({
    where: { slug: 'verifyshop' },
    include: {
      users: true,
    },
  })

  assert.ok(shop)
  assert.equal(shop.users[0].emailVerifiedAt, null)

  const blockedLogin = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      slug: 'verifyshop',
      email: 'owner@verify-shop.test',
      password: 'segredo123',
    }),
  })

  assert.equal(blockedLogin.response.status, 403)

  const tokenRecord = await prisma.authToken.findFirst({
    where: {
      userId: shop.users[0].id,
      type: 'EMAIL_VERIFICATION',
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  })

  assert.ok(tokenRecord)
  assert.equal(tokenRecord.tokenHash.length, 64)

  const resend = await jsonRequest('/api/auth/verify-email/resend', {
    method: 'POST',
    body: JSON.stringify({
      slug: 'verifyshop',
      email: 'owner@verify-shop.test',
    }),
  })

  assert.equal(resend.response.status, 200)

  const verificationToken = await prisma.authToken.findFirst({
    where: {
      userId: shop.users[0].id,
      type: 'EMAIL_VERIFICATION',
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  })

  assert.ok(verificationToken)

  const invalidVerify = await jsonRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({
      token: 'invalid-token-invalid-token',
    }),
  })

  assert.equal(invalidVerify.response.status, 400)

  const rawToken = 'verify-token-12345678901234567890'
  await prisma.authToken.create({
    data: {
      userId: shop.users[0].id,
      type: 'EMAIL_VERIFICATION',
      tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  const verify = await jsonRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({
      token: rawToken,
    }),
  })

  assert.equal(verify.response.status, 200)

  const verifiedUser = await prisma.user.findUnique({ where: { id: shop.users[0].id } })
  assert.ok(verifiedUser?.emailVerifiedAt)

  const login = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      slug: 'verifyshop',
      email: 'owner@verify-shop.test',
      password: 'segredo123',
    }),
  })

  assert.equal(login.response.status, 200)
  assert.ok(login.body.token)
})

test('forgot password issues reset token and reset password updates login credentials', { skip: !integrationEnabled }, async () => {
  const password = 'segredo123'
  const hashedPassword = await bcrypt.hash(password, 10)

  const shop = await prisma.barbershop.create({
    data: {
      name: 'Reset Shop',
      slug: 'reset-shop',
      users: {
        create: {
          name: 'Reset Admin',
          email: 'admin@reset-shop.test',
          password: hashedPassword,
          role: 'OWNER',
          emailVerifiedAt: new Date(),
        },
      },
    },
    include: {
      users: true,
    },
  })

  const forgot = await jsonRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      slug: shop.slug,
      email: 'admin@reset-shop.test',
    }),
  })

  assert.equal(forgot.response.status, 200)

  const resetToken = await prisma.authToken.findFirst({
    where: {
      userId: shop.users[0].id,
      type: 'PASSWORD_RESET',
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  })

  assert.ok(resetToken)

  const invalidReset = await jsonRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: 'invalid-token-invalid-token',
      password: 'nova-segura',
    }),
  })

  assert.equal(invalidReset.response.status, 400)

  const rawToken = 'reset-token-12345678901234567890'
  await prisma.authToken.create({
    data: {
      userId: shop.users[0].id,
      type: 'PASSWORD_RESET',
      tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  })

  const reset = await jsonRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: rawToken,
      password: 'nova-segura',
    }),
  })

  assert.equal(reset.response.status, 200)

  const oldLogin = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      slug: shop.slug,
      email: 'admin@reset-shop.test',
      password,
    }),
  })

  assert.equal(oldLogin.response.status, 401)

  const newLogin = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      slug: shop.slug,
      email: 'admin@reset-shop.test',
      password: 'nova-segura',
    }),
  })

  assert.equal(newLogin.response.status, 200)
})

test('public availability and booking flow works end-to-end', { skip: !integrationEnabled }, async () => {
  const bookingDate = new Date()
  bookingDate.setDate(bookingDate.getDate() + 2)
  bookingDate.setHours(9, 0, 0, 0)
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

  const misalignedBooking = await jsonRequest(`/api/public/${shop.slug}/bookings`, {
    method: 'POST',
    body: JSON.stringify({
      barberId: barber.id,
      serviceIds: [service.id],
      startTime: new Date(bookingDate.getTime() + 7 * 60 * 1000).toISOString(),
      customer: {
        name: 'Cliente Fora da Grelha',
        phone: '917777777',
        email: 'fora-grelha@publico.test',
      },
    }),
  })

  assert.equal(misalignedBooking.response.status, 422)
  assert.match(misalignedBooking.body.error, /outside barber working hours/)
})

test('public availability respects split barber-specific working hours', { skip: !integrationEnabled }, async () => {
  const bookingDate = new Date()
  bookingDate.setDate(bookingDate.getDate() + ((4 - bookingDate.getDay() + 7) % 7 || 7))
  bookingDate.setHours(0, 0, 0, 0)
  const dateParam = bookingDate.toISOString().slice(0, 10)

  const shop = await prisma.barbershop.create({
    data: {
      name: 'Split Hours Shop',
      slug: 'split-hours-shop',
      slotGranularityMinutes: 30,
    },
  })

  const barber = await prisma.barber.create({
    data: {
      name: 'Rui',
      barbershopId: shop.id,
      active: true,
    },
  })

  await prisma.workingHours.createMany({
    data: [
      {
        dayOfWeek: 4,
        startTime: '10:00',
        endTime: '12:00',
        active: true,
        barberId: barber.id,
        barbershopId: shop.id,
      },
      {
        dayOfWeek: 4,
        startTime: '14:00',
        endTime: '18:00',
        active: true,
        barberId: barber.id,
        barbershopId: shop.id,
      },
    ],
  })

  const availability = await jsonRequest(`/api/public/${shop.slug}/availability?barberId=${barber.id}&date=${dateParam}&duration=30`)
  assert.equal(availability.response.status, 200)

  const slotTimes = availability.body.slots.map((slot: { startTime: string }) =>
    new Date(slot.startTime).toISOString().slice(11, 16)
  )

  assert.deepEqual(slotTimes, [
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
  ])
})

test('customer plan lookup requires matching name and public subscribe plan is blocked', { skip: !integrationEnabled }, async () => {
  const shop = await prisma.barbershop.create({
    data: {
      name: 'Plan Shop',
      slug: 'plan-shop',
    },
  })

  const service = await prisma.service.create({
    data: {
      name: 'Plano Corte',
      price: 12,
      duration: 30,
      active: true,
      barbershopId: shop.id,
    },
  })

  const plan = await prisma.plan.create({
    data: {
      name: 'VIP',
      price: 29,
      intervalDays: 30,
      allowedDays: '1,2,3,4,5,6,0',
      active: true,
      barbershopId: shop.id,
      planServices: {
        create: [{ serviceId: service.id }],
      },
    },
  })

  await prisma.customer.create({
    data: {
      name: 'Cliente Certo',
      phone: '911111111',
      barbershopId: shop.id,
      planId: plan.id,
    },
  })

  const wrongNameLookup = await jsonRequest(`/api/public/${shop.slug}/customer-plan`, {
    method: 'POST',
    body: JSON.stringify({ phone: '911111111', name: 'Nome Errado' }),
  })

  assert.equal(wrongNameLookup.response.status, 200)
  assert.equal(wrongNameLookup.body.customer, null)

  const rightLookup = await jsonRequest(`/api/public/${shop.slug}/customer-plan`, {
    method: 'POST',
    body: JSON.stringify({ phone: '911111111', name: 'Cliente Certo' }),
  })

  assert.equal(rightLookup.response.status, 200)
  assert.equal(rightLookup.body.customer.name, 'Cliente Certo')
  assert.equal(rightLookup.body.customer.plan.name, 'VIP')

  const subscribeAttempt = await jsonRequest(`/api/public/${shop.slug}/subscribe-plan`, {
    method: 'POST',
    body: JSON.stringify({ planId: plan.id, name: 'Cliente Certo', phone: '911111111' }),
  })

  assert.equal(subscribeAttempt.response.status, 403)
})

test('cancelled bookings do not consume monthly booking quota', { skip: !integrationEnabled }, async () => {
  const bookingDate = new Date()
  bookingDate.setDate(bookingDate.getDate() + 3)
  bookingDate.setHours(9, 0, 0, 0)

  const shop = await prisma.barbershop.create({
    data: {
      name: 'Quota Shop',
      slug: 'quota-shop',
      subscriptionPlan: 'FREE',
    },
  })

  const barber = await prisma.barber.create({
    data: {
      name: 'Quota Barber',
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

  const customer = await prisma.customer.create({
    data: {
      name: 'Cliente Quota',
      phone: '922222222',
      barbershopId: shop.id,
    },
  })

  await prisma.workingHours.create({
    data: {
      dayOfWeek: bookingDate.getDay(),
      startTime: '09:00',
      endTime: '18:00',
      active: true,
      barberId: barber.id,
      barbershopId: shop.id,
    },
  })

  const monthStart = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), 1)
  const cancelledBookings = Array.from({ length: 30 }, (_, index) => {
    const startTime = new Date(monthStart)
    startTime.setDate(monthStart.getDate() + index)
    startTime.setHours(9, 0, 0, 0)
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)

    return {
      startTime,
      endTime,
      status: 'CANCELLED',
      totalPrice: 15,
      totalDuration: 30,
      barberId: barber.id,
      customerId: customer.id,
      barbershopId: shop.id,
    }
  })

  await prisma.booking.createMany({ data: cancelledBookings })

  const booking = await jsonRequest(`/api/public/${shop.slug}/bookings`, {
    method: 'POST',
    body: JSON.stringify({
      barberId: barber.id,
      serviceIds: [service.id],
      startTime: bookingDate.toISOString(),
      customer: {
        name: 'Cliente Quota',
        phone: '922222222',
        email: 'quota@test.dev',
      },
    }),
  })

  assert.equal(booking.response.status, 201)
})
