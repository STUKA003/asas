import { useQuery } from '@tanstack/react-query'
import { useTranslation, Trans } from 'react-i18next'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import type { Service } from '@/lib/types'

export function StepService() {
  const { slug } = useTenant()
  const { service: selected, setService, setStep } = useBookingStore()
  const { t } = useTranslation(['public', 'common'])

  const { data: services, isLoading } = useQuery({
    queryKey: ['public', slug, 'services'],
    queryFn:  () => publicApi(slug).services(),
    enabled:  !!slug,
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t('booking.steps.service.title')}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(services as Service[] | undefined)?.map((s) => (
          <button
            key={s.id}
            onClick={() => setService(s)}
            className={cn(
              'group relative text-left rounded-3xl border p-5 transition',
              selected?.id === s.id
                ? 'border-primary-500 bg-primary-50 shadow-medium'
                : 'border-neutral-200 bg-white shadow-soft hover:border-primary-200 hover:shadow-medium'
            )}
          >
            <div className="absolute right-5 top-5">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border transition',
                  selected?.id === s.id
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-neutral-300 bg-white text-transparent group-hover:border-primary-300'
                )}
              >
                <CheckCircle2 size={14} />
              </div>
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="pr-8 text-base font-semibold text-ink">{s.name}</p>
                {s.description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">{s.description}</p>}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
              <span className="text-lg font-semibold text-primary-700">{formatCurrency(s.price)}</span>
              <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                <Clock size={12} /> {formatDuration(s.duration)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button disabled={!selected} onClick={() => setStep(1)}>
          {t('common:btn.continue')}
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  )
}
