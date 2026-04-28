import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { pt } from 'date-fns/locale'
import { Clock, Euro, Phone, Trash2 } from 'lucide-react'
import type { Booking, BookingStatus, Extra, Product } from '@/lib/types'
import { formatCurrency, getBookingClientName, toWallClockDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

const STATUS_ACTIONS: Record<string, { status: string; label: string; color: string }[]> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Confirmar', color: 'bg-primary-600 text-white hover:bg-primary-700' },
    { status: 'CANCELLED', label: 'Cancelar', color: 'bg-red-500 text-white hover:bg-red-600' },
  ],
  CONFIRMED: [
    { status: 'COMPLETED', label: 'Concluir', color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
    { status: 'NO_SHOW', label: 'Não compareceu', color: 'bg-orange-500 text-white hover:bg-orange-600' },
    { status: 'CANCELLED', label: 'Cancelar', color: 'bg-red-500 text-white hover:bg-red-600' },
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
  const start = toWallClockDate(booking.startTime)
  const end = toWallClockDate(booking.endTime)
  const actions = STATUS_ACTIONS[booking.status] ?? []
  const extraOptions = [
    { value: '', label: 'Selecionar extra' },
    ...extras.map((extra) => ({ value: extra.id, label: `${extra.name} • ${formatCurrency(extra.price)}` })),
  ]
  const productOptions = [
    { value: '', label: 'Selecionar produto' },
    ...products.map((product) => ({ value: product.id, label: `${product.name} • ${formatCurrency(product.price)} • stock ${product.stock}` })),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-100 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold leading-tight">{getBookingClientName(booking)}</p>
                {booking.customer.plan ? (
                  <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                    {booking.customer.plan.name}
                  </span>
                ) : (
                  <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                    Avulso
                  </span>
                )}
              </div>
              {booking.customer.phone && (
                <a href={`tel:${booking.customer.phone}`} className="mt-0.5 flex items-center gap-1 text-sm text-zinc-400 hover:text-primary-500">
                  <Phone size={12} /> {booking.customer.phone}
                </a>
              )}
              {booking.attendeeName && booking.attendeeName !== booking.customer.name ? (
                <p className="mt-1 text-xs text-zinc-400">Responsável: {booking.customer.name}</p>
              ) : null}
            </div>
            <StatusBadge status={booking.status as BookingStatus} />
          </div>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="shrink-0 text-zinc-400" />
            <span className="font-medium">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">{format(start, "d 'de' MMM", { locale: pt })}</span>
          </div>

          <div className="space-y-1.5">
            {booking.services.map((service) => {
              const coveredByPlan = !!booking.customer.plan && service.price === 0

              return (
                <div key={service.serviceId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span>{service.service.name}</span>
                    {coveredByPlan ? (
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">plano</span>
                    ) : null}
                  </div>
                  <span className={coveredByPlan ? 'text-zinc-400 line-through' : 'text-zinc-500'}>
                    {formatCurrency(service.price)}
                  </span>
                </div>
              )
            })}

            {booking.extras.map((extra) => (
              <div key={extra.id} className="flex items-center justify-between gap-3 text-sm text-zinc-500">
                <span>+ {extra.extra.name}</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(extra.price)}</span>
                  {canManageItems ? (
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-600 disabled:opacity-50"
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
              <div key={product.id} className="flex items-center justify-between gap-3 text-sm text-zinc-500">
                <span>{product.product.name}</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(product.price)}</span>
                  {canManageItems ? (
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-600 disabled:opacity-50"
                      disabled={isRemovingItem}
                      onClick={() => onRemoveItem('product', product.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-1">
            <div className="flex items-center gap-1 text-sm font-semibold">
              <Euro size={13} className="text-zinc-400" />
              {booking.customer.plan ? 'A pagar hoje' : 'Total'}
            </div>
            {booking.totalPrice === 0 && booking.customer.plan ? (
              <span className="text-sm font-semibold text-violet-600">Coberto pelo plano</span>
            ) : (
              <span className="font-bold text-primary-600">{formatCurrency(booking.totalPrice)}</span>
            )}
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <p className="text-xs text-zinc-500">Extras e produtos</p>
            {canManageItems ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select options={extraOptions} value={selectedExtraId} onChange={(e) => onExtraChange(e.target.value)} />
                  <Select options={productOptions} value={selectedProductId} onChange={(e) => onProductChange(e.target.value)} />
                </div>
                {addItemsError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {addItemsError}
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button variant="secondary" loading={isAddingItems} disabled={!selectedExtraId && !selectedProductId} onClick={onAddItems}>
                    Adicionar extra/produto
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                Disponível apenas no plano BASIC ou PRO.
              </div>
            )}
          </div>
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {actions.map((action) => (
              <Button
                key={action.status}
                variant="ghost"
                loading={isUpdatingStatus}
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange(action.status)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${action.color}`}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full rounded-xl py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
