type PublicPlanWithServices = {
  id: string
  name: string
  allowedDays: string
  planServices: Array<{
    service: { id: string; name: string }
  }>
}

type CustomerPlanWithServices = {
  id: string
  name: string
  allowedDays: string
  planServices: Array<{
    service: { id: string; name: string }
  }>
}

type CustomerLookupResult = {
  id: string
  name: string
  phone: string | null
  plan: CustomerPlanWithServices | null
  bookings: Array<{ id: string; startTime: Date; status: string }>
}

const parseAllowedDays = (allowedDays: string) =>
  allowedDays
    .split(',')
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)

export function serializePublicPlan(plan: PublicPlanWithServices) {
  return {
    ...plan,
    allowedDays: parseAllowedDays(plan.allowedDays),
    allowedServices: plan.planServices.map((item) => item.service),
  }
}

export function serializeCustomerPlanLookup(customer: CustomerLookupResult) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    plan: customer.plan
      ? {
          id: customer.plan.id,
          name: customer.plan.name,
          allowedDays: parseAllowedDays(customer.plan.allowedDays),
          allowedServices: customer.plan.planServices
            .map((item) => item.service)
            .sort((a, b) => a.name.localeCompare(b.name)),
        }
      : null,
    activeBooking: customer.bookings[0] ?? null,
  }
}
