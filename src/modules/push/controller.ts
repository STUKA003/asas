import { Request, Response } from 'express'
import { z } from 'zod'
import { getPushConfig, removePushSubscription, upsertPushSubscription } from '../../lib/push'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const saveSubscriptionSchema = z.object({
  subscription: subscriptionSchema,
})

const removeSubscriptionSchema = z.object({
  endpoint: z.string().url(),
})

export async function getAdminPushConfig(_req: Request, res: Response) {
  res.json(getPushConfig())
}

export async function saveAdminPushSubscription(req: Request, res: Response) {
  const parsed = saveSubscriptionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  await upsertPushSubscription({
    audience: 'admin',
    barbershopId: req.auth.barbershopId,
    userId: req.auth.userId,
    endpoint: parsed.data.subscription.endpoint,
    keys: parsed.data.subscription.keys,
    userAgent: req.headers['user-agent'],
  })

  res.json({ ok: true })
}

export async function deleteAdminPushSubscription(req: Request, res: Response) {
  const parsed = removeSubscriptionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  await removePushSubscription(parsed.data.endpoint)
  res.json({ ok: true })
}

export async function getBarberPushConfig(_req: Request, res: Response) {
  res.json(getPushConfig())
}

export async function saveBarberPushSubscription(req: Request, res: Response) {
  const parsed = saveSubscriptionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  await upsertPushSubscription({
    audience: 'barber',
    barbershopId: req.barberAuth.barbershopId,
    barberId: req.barberAuth.barberId,
    endpoint: parsed.data.subscription.endpoint,
    keys: parsed.data.subscription.keys,
    userAgent: req.headers['user-agent'],
  })

  res.json({ ok: true })
}

export async function deleteBarberPushSubscription(req: Request, res: Response) {
  const parsed = removeSubscriptionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  await removePushSubscription(parsed.data.endpoint)
  res.json({ ok: true })
}
