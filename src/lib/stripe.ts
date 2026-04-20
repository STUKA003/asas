import Stripe from 'stripe'
import type { Request } from 'express'
import { PLAN_LIMITS, type SubscriptionPlan } from './plans'

type PaidPlan = Exclude<SubscriptionPlan, 'FREE'>
type StripeClient = ReturnType<typeof createStripeClient>

let stripeClient: StripeClient | null = null

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = createStripeClient()
  }
  return stripeClient
}

function createStripeClient() {
  return new Stripe(requiredEnv('STRIPE_SECRET_KEY'))
}

export function getStripeWebhookSecret() {
  return requiredEnv('STRIPE_WEBHOOK_SECRET')
}

export function getStripePriceId(plan: PaidPlan) {
  const envName = plan === 'BASIC' ? 'STRIPE_PRICE_BASIC_MONTHLY' : 'STRIPE_PRICE_PRO_MONTHLY'
  return requiredEnv(envName)
}

export function resolveSubscriptionPlanFromPriceId(priceId: string | null | undefined): SubscriptionPlan | null {
  if (!priceId) return null
  if (process.env.STRIPE_PRICE_BASIC_MONTHLY === priceId) return 'BASIC'
  if (process.env.STRIPE_PRICE_PRO_MONTHLY === priceId) return 'PRO'
  return null
}

export function getAppUrl(req?: Request) {
  const configured = process.env.APP_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  if (!req) {
    throw new Error('Missing APP_URL configuration')
  }
  return `${req.protocol}://${req.get('host')}`
}

export function getPlanCheckoutSummary(plan: PaidPlan) {
  const details = PLAN_LIMITS[plan]
  return {
    plan,
    label: details.label,
    price: details.price,
    priceId: getStripePriceId(plan),
  }
}
