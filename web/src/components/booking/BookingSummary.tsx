import { useBookingStore } from '@/store/booking'
import { useTenant } from '@/providers/TenantProvider'
import { formatCurrency, formatDuration, toWallClockDate } from '@/lib/utils'
import { BadgeCheck, CalendarDays, Clock, DollarSign, Sparkles, User } from 'lucide-react'

export function BookingSummary() {
  const { service, extras, products, customerPlan, barber, date, slot } = useBookingStore()
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
  const lines = [
    barber ? { icon: User, label: 'Profissional', value: barber.name } : null,
    date ? { icon: CalendarDays, label: 'Data', value: new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' }) } : null,
    slot ? { icon: Clock, label: 'Hora', value: toWallClockDate(slot.startTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) } : null,
  ].filter(Boolean) as Array<{ icon: typeof User; label: string; value: string }>

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 text-sm shadow-medium">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Resumo da reserva</p>
          <p className="mt-2 text-lg font-semibold text-ink">Quase fechado</p>
          <p className="mt-1 text-sm text-ink-muted">Revê o essencial antes de avançares para o próximo passo.</p>
        </div>
        <div className="tenant-soft-icon flex h-11 w-11 items-center justify-center rounded-2xl">
          <Sparkles size={18} />
        </div>
      </div>

      {lines.length > 0 && (
        <div className="mt-5 grid gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center gap-3 text-sm text-ink-soft">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary-700 shadow-soft">
                <line.icon size={14} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{line.label}</p>
                <p className="text-sm font-medium text-ink">{line.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Serviço principal</p>
            <p className="mt-1 text-base font-semibold text-ink">{service.name}</p>
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
        <div className="mt-4 flex items-center gap-1.5 text-xs text-ink-muted">
          <Clock size={13} />
          <span>{formatDuration(duration)} de experiência reservada</span>
        </div>
      </div>

      {(extraPrices.length > 0 || productPrices.length > 0) && (
        <div className="mt-4 space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Adicionados</p>
          {extraPrices.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-ink-soft">
              <span>+ {e.name}</span>
              <div className="flex items-center gap-1.5">
                {customerPlan && discount > 0 && <span className="line-through text-xs text-ink-muted">{formatCurrency(e.price)}</span>}
                <span>{formatCurrency(e.effectivePrice)}</span>
              </div>
            </div>
          ))}
          {productPrices.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-ink-soft">
              <span>{p.name}</span>
              <div className="flex items-center gap-1.5">
                {customerPlan && discount > 0 && <span className="line-through text-xs text-ink-muted">{formatCurrency(p.price)}</span>}
                <span>{formatCurrency(p.effectivePrice)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-[1.5rem] bg-ink px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Total estimado</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(total)}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <DollarSign size={18} className="text-primary-200" />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[1.25rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-5 text-ink-muted">
        O valor final pode refletir extras, produtos e benefícios do teu plano no momento da confirmação.
      </div>
    </div>
  )
}
