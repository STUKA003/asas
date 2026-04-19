import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { Plus, Minus, Clock, ShoppingCart, ChevronDown } from 'lucide-react'
import type { Extra, Product } from '@/lib/types'

export function StepExtrasProducts() {
  const { slug } = useTenant()
  const { extras: selectedExtras, products: selectedProducts, toggleExtra, toggleProduct, setStep } = useBookingStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: extras, isLoading: loadingExtras } = useQuery({
    queryKey: ['public', slug, 'extras'],
    queryFn:  () => publicApi(slug).extras(),
    enabled:  !!slug,
  })

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['public', slug, 'products'],
    queryFn:  () => publicApi(slug).products(),
    enabled:  !!slug,
  })

  if (loadingExtras || loadingProducts) return <PageLoader />

  const extraList  = (extras  as Extra[]   | undefined) ?? []
  const productList = (products as Product[] | undefined) ?? []
  const hasContent = extraList.length > 0 || productList.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Extras & Produtos</h2>
        <p className="text-zinc-500 text-sm mt-1">Adicione ao seu atendimento (opcional)</p>
      </div>

      {!hasContent && (
        <p className="text-sm text-zinc-400 py-8 text-center">Sem extras ou produtos disponíveis.</p>
      )}

      {/* Extras */}
      {extraList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Extras</p>
          {extraList.map((e) => {
            const isSelected = selectedExtras.some((s) => s.id === e.id)
            return (
              <div
                key={e.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all',
                  isSelected
                    ? 'tenant-selected'
                    : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                )}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{e.name}</p>
                  {e.description && <p className="text-xs text-zinc-400 mt-0.5">{e.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="tenant-ink text-sm font-bold">{formatCurrency(e.price)}</span>
                    {e.duration > 0 && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock size={11} /> +{formatDuration(e.duration)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleExtra(e)}
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center transition-all shrink-0',
                    isSelected
                      ? 'tenant-button text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-zinc-200'
                  )}
                >
                  {isSelected ? <Minus size={14} /> : <Plus size={14} />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Products */}
      {productList.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Produtos</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {productList.map((p) => {
              const isSelected = selectedProducts.some((s) => s.id === p.id)
              return (
                <div
                  key={p.id}
                  className={cn(
                    'relative p-4 rounded-2xl border-2 transition-all',
                    isSelected
                      ? 'tenant-selected'
                      : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  )}
                >
                  <div className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingCart size={24} className="text-zinc-300" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{p.name}</p>
                    {p.description && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <ChevronDown size={16} className={cn('transition-transform', expandedId === p.id && 'rotate-180')} />
                      </button>
                    )}
                  </div>
                  {p.description && (
                    <p className={cn('text-xs text-zinc-400 mt-0.5 leading-relaxed', expandedId !== p.id && 'line-clamp-2')}>
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="tenant-ink font-bold">{formatCurrency(p.price)}</span>
                    <button
                      onClick={() => toggleProduct(p)}
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                        isSelected
                          ? 'tenant-button text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-zinc-200'
                      )}
                    >
                      {isSelected ? <Minus size={14} /> : <Plus size={14} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
        <Button onClick={() => setStep(4)}>Próximo</Button>
      </div>
    </div>
  )
}
