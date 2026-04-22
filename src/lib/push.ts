import webpush, { type PushSubscription as WebPushSubscription } from 'web-push'
import { prisma } from './prisma'

type StoredSubscriptionKeys = {
  auth: string
  p256dh: string
}

type PushAudience = 'admin' | 'barber'

type UpsertPushSubscriptionInput = {
  audience: PushAudience
  barbershopId: string
  barberId?: string
  contentEncoding?: string
  endpoint: string
  keys: StoredSubscriptionKeys
  userAgent?: string
  userId?: string
}

type PushPayload = {
  body: string
  title: string
  url: string
}

let configured = false

function getEnv(name: string) {
  return process.env[name]?.trim() ?? ''
}

function ensureConfigured() {
  if (configured) return true

  const publicKey = getEnv('VAPID_PUBLIC_KEY')
  const privateKey = getEnv('VAPID_PRIVATE_KEY')
  const subject = getEnv('VAPID_SUBJECT')

  if (!publicKey || !privateKey || !subject) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export function getPushConfig() {
  const enabled = ensureConfigured()
  return {
    enabled,
    publicKey: enabled ? getEnv('VAPID_PUBLIC_KEY') : null,
  }
}

export async function upsertPushSubscription(input: UpsertPushSubscriptionInput) {
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: input.endpoint },
  })

  const data = {
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    contentEncoding: input.contentEncoding || 'aesgcm',
    userAgent: input.userAgent,
    barbershopId: input.barbershopId,
    userId: input.audience === 'admin' ? input.userId ?? null : null,
    barberId: input.audience === 'barber' ? input.barberId ?? null : null,
  }

  if (!existing) {
    await prisma.pushSubscription.create({ data })
    return
  }

  await prisma.pushSubscription.update({
    where: { endpoint: input.endpoint },
    data,
  })
}

export async function removePushSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } })
}

async function sendToSubscription(
  subscription: {
    id: string
    endpoint: string
    p256dh: string
    auth: string
    contentEncoding: string
  },
  payload: PushPayload
) {
  if (!ensureConfigured()) return

  const webPushSubscription: WebPushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  try {
    await webpush.sendNotification(webPushSubscription, JSON.stringify(payload), {
      contentEncoding: subscription.contentEncoding as 'aesgcm' | 'aes128gcm',
      TTL: 60,
    })
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as { statusCode?: number }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : null

    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: subscription.id } })
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('[push] delivery failed', error)
    }
  }
}

export async function sendNotificationPush(input: {
  barberId: string
  barbershopId: string
  body: string
  bookingId?: string | null
}) {
  if (!ensureConfigured()) return

  const [barbershop, adminSubscriptions, barberSubscriptions] = await Promise.all([
    prisma.barbershop.findUnique({
      where: { id: input.barbershopId },
      select: { slug: true },
    }),
    prisma.pushSubscription.findMany({
      where: { barbershopId: input.barbershopId, userId: { not: null } },
      select: { id: true, endpoint: true, p256dh: true, auth: true, contentEncoding: true },
    }),
    prisma.pushSubscription.findMany({
      where: { barbershopId: input.barbershopId, barberId: input.barberId },
      select: { id: true, endpoint: true, p256dh: true, auth: true, contentEncoding: true },
    }),
  ])

  await Promise.all([
    ...adminSubscriptions.map((subscription) =>
      sendToSubscription(subscription, {
        title: 'Trimio Studio',
        body: input.body,
        url: '/admin/bookings',
      })
    ),
    ...barberSubscriptions.map((subscription) =>
      sendToSubscription(subscription, {
        title: 'Trimio Flow',
        body: input.body,
        url: barbershop ? `/${barbershop.slug}/barber/schedule` : '/',
      })
    ),
  ])
}
