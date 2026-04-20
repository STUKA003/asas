import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { getStripeClient, getStripeWebhookSecret, resolveSubscriptionPlanFromPriceId } from '../../lib/stripe'
import type { SubscriptionPlan } from '../../lib/plans'

type StripeSubscriptionLike = {
  id: string
  customer: string | { id: string }
  status: string
  current_period_end?: number | null
  metadata: Record<string, string>
  items: { data: Array<{ price: { id: string } }> }
}

function subscriptionPlanFromStripeSubscription(subscription: StripeSubscriptionLike): SubscriptionPlan {
  const metadataPlan = subscription.metadata.plan as SubscriptionPlan | undefined
  if (metadataPlan === 'BASIC' || metadataPlan === 'PRO') return metadataPlan

  const firstItem = subscription.items.data[0]
  return resolveSubscriptionPlanFromPriceId(firstItem?.price.id) ?? 'FREE'
}

function subscriptionEndsAt(subscription: StripeSubscriptionLike) {
  return subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null
}

async function syncSubscription(subscription: StripeSubscriptionLike) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const plan = subscriptionPlanFromStripeSubscription(subscription)
  const endsAt = subscriptionEndsAt(subscription)
  const canceledStatuses = new Set(['canceled', 'incomplete_expired', 'unpaid'])
  const isCanceled = canceledStatuses.has(subscription.status)
  const matches = [
    subscription.id ? { stripeSubscriptionId: subscription.id } : null,
    customerId ? { stripeCustomerId: customerId } : null,
    subscription.metadata.barbershopId ? { id: subscription.metadata.barbershopId } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  if (matches.length === 0) return

  await prisma.barbershop.updateMany({
    where: {
      OR: matches,
    },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: isCanceled ? null : subscription.id,
      stripeSubscriptionStatus: subscription.status,
      subscriptionPlan: isCanceled ? 'FREE' : plan,
      subscriptionEndsAt: isCanceled ? null : endsAt,
    },
  })
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripeClient()
  const signature = req.headers['stripe-signature']

  if (!signature || Array.isArray(signature)) {
    res.status(400).send('Missing Stripe signature')
    return
  }

  let event: any

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, getStripeWebhookSecret())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature'
    res.status(400).send(`Webhook Error: ${message}`)
    return
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const barbershopId = session.metadata?.barbershopId

      if (barbershopId) {
        await prisma.barbershop.update({
          where: { id: barbershopId },
          data: {
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
          },
        })
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await syncSubscription(event.data.object as StripeSubscriptionLike)
      break
    }

    default:
      break
  }

  res.json({ received: true })
}
