import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { Clock } from 'lucide-react'
import type { Service } from '@/lib/types'

export function StepService() {
  const { slug } = useTenant()
  const { service: selected, setService, setStep } = useBookingStore()

  const { data: services, isLoading } = useQuery({
    queryKey: ['public', slug, 'services'],
    queryFn:  () => publicApi(slug).services(),
    enabled:  !!slug,
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Escolha um serviço</h2>
        <p className="text-zinc-500 text-sm mt-1">Selecione o serviço que deseja realizar</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(services as Service[] | undefined)?.map((s) => (
          <button
            key={s.id}
            onClick={() => setService(s)}
            className={cn(
              'text-left p-4 rounded-2xl border-2 transition-all',
              selected?.id === s.id
                ? 'tenant-selected'
                : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold text-sm">{s.name}</p>
                {s.description && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{s.description}</p>}
              </div>
              {selected?.id === s.id && (
                <div className="tenant-button flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="tenant-ink text-base font-bold">{formatCurrency(s.price)}</span>
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Clock size={12} /> {formatDuration(s.duration)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button disabled={!selected} onClick={() => setStep(1)}>Próximo</Button>
      </div>
    </div>
  )
}
