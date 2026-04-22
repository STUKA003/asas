import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Clock3, Euro, Phone, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import type { Booking, BookingStatus, Extra, Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

const STATUS_ACTIONS: Record<string, { status: string; label: string; color: string }[]> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Confirmar', color: 'bg-gradient-to-r from-orange-500 to-amber-400 text-zinc-950 hover:from-orange-400 hover:to-amber-300' },
    { status: 'CANCELLED', label: 'Cancelar', color: 'bg-red-500 text-white hover:bg-red-400' },
  ],
  CONFIRMED: [
    { status: 'COMPLETED', label: 'Concluir', color: 'bg-emerald-500 text-white hover:bg-emerald-400' },
    { status: 'NO_SHOW', label: 'Não compareceu', color: 'bg-zinc-700 text-white hover:bg-zinc-600' },
    { status: 'CANCELLED', label: 'Cancelar', color: 'bg-red-500 text-white hover:bg-red-400' },
  ],
}

interface BookingModalProps {
  booking: Booking
  onClose: () => void
  onStatusChange: (status: string) => void
  canManageItems: boolean
  extras: Extra[]
  products: Product[]
  selectedExtraId: string
  selectedProductId: string
  addItemsError: string | null
  isAddingItems: boolean
  isRemovingItem: boolean
  isUpdatingStatus: boolean
  onExtraChange: (value: string) => void
  onProductChange: (value: string) => void
  onAddItems: () => void
  onRemoveItem: (type: 'extra' | 'product', itemId: string) => void
}

export function BookingModal({
  booking,
  onClose,
  onStatusChange,
  canManageItems,
  extras,
  products,
  selectedExtraId,
  selectedProductId,
  addItemsError,
  isAddingItems,
  isRemovingItem,
  isUpdatingStatus,
  onExtraChange,
  onProductChange,
  onAddItems,
  onRemoveItem,
}: BookingModalProps) {
  const start = new Date(booking.startTime)
  const end = new Date(booking.endTime)
  const actions = STATUS_ACTIONS[booking.status] ?? []
  const extraOptions = [
    { value: '', label: 'Selecionar extra' },
    ...extras.map((extra) => ({ value: extra.id, label: `${extra.name} • ${formatCurrency(extra.price)}` })),
  ]
  const productOptions = [
    { value: '', label: 'Selecionar produto' },
    ...products.map((product) => ({
      value: product.id,
      label: `${product.name} • ${formatCurrency(product.price)} • stock ${product.stock}`,
    })),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#111116] text-white shadow-[0_40px_120px_-50px_rgba(0,0,0,0.95)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_16rem),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 pb-5 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-2xl font-semibold leading-tight text-white">{booking.customer.name}</p>
                {booking.customer.plan ? (
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
                    {booking.customer.plan.name}
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Avulso
                  </span>
                )}
              </div>

              {booking.customer.phone ? (
                <a href={`tel:${booking.customer.phone}`} className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-orange-200">
                  <Phone size={14} /> {booking.customer.phone}
                </a>
              ) : null}
            </div>

            <StatusBadge status={booking.status as BookingStatus} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                <Clock3 size={13} />
                Horário
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                <Sparkles size={13} />
                Data
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {format(start, "d 'de' MMMM", { locale: pt })}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                <Euro size={13} />
                Total
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {booking.totalPrice === 0 && booking.customer.plan ? 'Coberto pelo plano' : formatCurrency(booking.totalPrice)}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[68vh] space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Serviços</p>
            <div className="mt-3 space-y-2">
              {booking.services.map((service) => {
                const coveredByPlan = !!booking.customer.plan && service.price === 0

                return (
                  <div key={service.serviceId} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{service.service.name}</p>
                      {coveredByPlan ? (
                        <p className="mt-1 text-xs text-violet-300">Coberto pelo plano do cliente</p>
                      ) : null}
                    </div>
                    <span className={coveredByPlan ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <ShoppingBag size={13} />
              Extras e produtos
            </div>

            <div className="mt-3 space-y-2">
              {booking.extras.map((extra) => (
                <div key={extra.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-zinc-200">+ {extra.extra.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400">{formatCurrency(extra.price)}</span>
                    {canManageItems ? (
                      <button
                        type="button"
                        className="text-red-300 transition hover:text-red-200 disabled:opacity-50"
                        disabled={isRemovingItem}
                        onClick={() => onRemoveItem('extra', extra.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {booking.products.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-zinc-200">{product.product.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400">{formatCurrency(product.price)}</span>
                    {canManageItems ? (
                      <button
                        type="button"
                        className="text-red-300 transition hover:text-red-200 disabled:opacity-50"
                        disabled={isRemovingItem}
                        onClick={() => onRemoveItem('product', product.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {booking.extras.length === 0 && booking.products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-zinc-500">
                  Ainda sem extras nem produtos associados.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Adicionar itens</p>
            {canManageItems ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Select options={extraOptions} value={selectedExtraId} onChange={(e) => onExtraChange(e.target.value)} />
                  <Select options={productOptions} value={selectedProductId} onChange={(e) => onProductChange(e.target.value)} />
                </div>
                {addItemsError ? (
                  <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {addItemsError}
                  </div>
                ) : null}
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    loading={isAddingItems}
                    disabled={!selectedExtraId && !selectedProductId}
                    className="rounded-2xl border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                    onClick={onAddItems}
                  >
                    Adicionar extra/produto
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-400">
                Disponível apenas no plano BASIC ou PRO.
              </div>
            )}
          </section>
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-5 sm:px-6">
            {actions.map((action) => (
              <Button
                key={action.status}
                variant="ghost"
                loading={isUpdatingStatus}
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange(action.status)}
                className={`flex-1 rounded-2xl border-0 py-3 text-sm font-semibold ${action.color}`}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="border-t border-white/10 px-5 py-4 sm:px-6">
          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-white/10 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
