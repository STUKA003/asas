import { useBookingStore } from '@/store/booking'
import { useTenant } from '@/providers/TenantProvider'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { BadgeCheck, Clock, DollarSign, Sparkles } from 'lucide-react'

export function BookingSummary() {
  const { service, extras, products, customerPlan } = useBookingStore()
  const { barbershop } = useTenant()
  if (!service) return null

  const planServiceIds = new Set(customerPlan?.allowedServices.map((s) => s.id) ?? [])
  const discount = barbershop?.planMemberDiscount ?? 0
  const applyDiscount = (price: number) => customerPlan ? price * (1 - discount / 100) : price

  const servicePrice = planServiceIds.has(service.id) ? 0 : applyDiscount(service.price)
  const extraPrices  = extras.map((e)  => ({ ...e, effectivePrice: applyDiscount(e.price) }))
  const productPrices = products.map((p) => ({ ...p, effectivePrice: applyDiscount(p.price) }))

  const total =
    servicePrice +
    extraPrices.reduce((s, e) => s + e.effectivePrice, 0) +
    productPrices.reduce((s, p) => s + p.effectivePrice, 0)

  const duration = service.duration + extras.reduce((s, e) => s + e.duration, 0)

  return (
    <div className="surface-panel rounded-[1.75rem] border border-white/70 p-5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Resumo da reserva</p>
          <p className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-100">Quase fechado</p>
        </div>
        <div className="tenant-soft-icon flex h-11 w-11 items-center justify-center rounded-2xl">
          <Sparkles size={18} />
        </div>
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-zinc-200/70 bg-white/75 p-4 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Serviço principal</p>
            <p className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-100">{service.name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {planServiceIds.has(service.id) && (
              <span className="tenant-chip inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                <BadgeCheck size={10} /> Plano
              </span>
            )}
            <span className={planServiceIds.has(service.id) ? 'line-through text-zinc-400' : ''}>
              {formatCurrency(service.price)}
            </span>
            {planServiceIds.has(service.id) && <span className="font-semibold text-emerald-600">{formatCurrency(0)}</span>}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock size={13} />
          <span>{formatDuration(duration)} de experiência reservada</span>
        </div>
      </div>

      {(extraPrices.length > 0 || productPrices.length > 0) && (
        <div className="mt-4 space-y-2 rounded-[1.35rem] border border-zinc-200/70 bg-zinc-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Adicionados</p>
          {extraPrices.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-zinc-600">
              <span>+ {e.name}</span>
              <div className="flex items-center gap-1.5">
                {customerPlan && discount > 0 && <span className="line-through text-xs text-zinc-400">{formatCurrency(e.price)}</span>}
                <span>{formatCurrency(e.effectivePrice)}</span>
              </div>
            </div>
          ))}
          {productPrices.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-zinc-600">
              <span>{p.name}</span>
              <div className="flex items-center gap-1.5">
                {customerPlan && discount > 0 && <span className="line-through text-xs text-zinc-400">{formatCurrency(p.price)}</span>}
                <span>{formatCurrency(p.effectivePrice)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Total estimado</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(total)}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <DollarSign size={18} className="tenant-ink" />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[1.25rem] border border-zinc-200/70 bg-white/70 px-4 py-3 text-xs leading-5 text-zinc-500">
        O valor final pode refletir extras, produtos e benefícios do teu plano no momento da confirmação.
      </div>
    </div>
  )
}
