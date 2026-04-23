import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { Plus, Minus, Clock } from 'lucide-react'
import type { Extra } from '@/lib/types'

export function StepExtras() {
  const { slug } = useTenant()
  const { extras: selected, toggleExtra, setStep } = useBookingStore()

  const { data: extras, isLoading } = useQuery({
    queryKey: ['public', slug, 'extras'],
    queryFn:  () => publicApi(slug).extras(),
    enabled:  !!slug,
  })

  // Salta automaticamente se não há extras disponíveis
  useEffect(() => {
    if (!isLoading && extras && (extras as Extra[]).length === 0) {
      setStep(4)
    }
  }, [isLoading, extras, setStep])

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Extras <span className="text-sm font-normal text-zinc-400">opcional</span></h2>
      </div>

      <div className="space-y-2">
        {(extras as Extra[] | undefined)?.map((e) => {
          const isSelected = selected.some((s) => s.id === e.id)
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
                <div className="flex items-center gap-3 mt-2">
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
                  'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                  isSelected
                    ? 'tenant-button text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                )}
              >
                {isSelected ? <Minus size={14} /> : <Plus size={14} />}
              </button>
            </div>
          )
        })}
        {!(extras as Extra[] | undefined)?.length && (
          <p className="text-sm text-zinc-400 py-8 text-center">Sem extras disponíveis.</p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
        <Button onClick={() => setStep(4)}>Próximo</Button>
      </div>
    </div>
  )
}
