import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { formatCurrency, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import type { Product } from '@/lib/types'

export function StepProducts() {
  const { slug } = useTenant()
  const { products: selected, toggleProduct, setStep } = useBookingStore()
  const { t } = useTranslation(['public', 'common'])
  const confirmationStep = 6

  const { data: products, isLoading } = useQuery({
    queryKey: ['public', slug, 'products'],
    queryFn:  () => publicApi(slug).products(),
    enabled:  !!slug,
  })

  useEffect(() => {
    if (!isLoading && products && (products as Product[]).length === 0) {
      setStep(confirmationStep)
    }
  }, [isLoading, products, setStep])

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t('booking.steps.products.title')}</h2>
        <p className="text-zinc-500 text-sm mt-1">{t('booking.steps.products.subtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(products as Product[]).map((p) => {
          const isSelected = selected.some((s) => s.id === p.id)

          return (
            <div
              key={p.id}
              className={cn(
                'p-4 rounded-2xl border-2 transition-all',
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

              <p className="font-medium text-sm">{p.name}</p>
              {p.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                  {p.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-3">
                <span className="tenant-ink font-bold">{formatCurrency(p.price)}</span>
                <button
                  type="button"
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

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(4)}>{t('common:btn.back')}</Button>
        <Button onClick={() => setStep(6)}>{t('booking.steps.products.reviewOrder')}</Button>
      </div>
    </div>
  )
}
