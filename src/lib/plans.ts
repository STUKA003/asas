export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO'

export const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxBarbers: number
  maxMonthlyBookings: number
  label: string
  price: number // EUR/month
}> = {
  FREE: {
    label: 'Grátis',
    price: 0,
    maxBarbers: 1,
    maxMonthlyBookings: 30,
  },
  BASIC: {
    label: 'Básico',
    price: 19,
    maxBarbers: 3,
    maxMonthlyBookings: Infinity,
  },
  PRO: {
    label: 'Pro',
    price: 39,
    maxBarbers: Infinity,
    maxMonthlyBookings: Infinity,
  },
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[(plan as SubscriptionPlan)] ?? PLAN_LIMITS.FREE
}

/** Returns the effective plan, downgrading to FREE if the subscription has expired */
export function getEffectivePlan(plan: string, endsAt: Date | null): SubscriptionPlan {
  if (plan === 'FREE') return 'FREE'
  if (endsAt && endsAt < new Date()) return 'FREE'
  return (plan as SubscriptionPlan) ?? 'FREE'
}
