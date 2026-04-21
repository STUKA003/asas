import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { ArrowRight, CheckCircle2, Clock, Sparkles } from 'lucide-react'
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Passo 1</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Escolhe o serviço</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Começa pelo que queres fazer hoje. O resto do fluxo adapta-se automaticamente à duração e disponibilidade.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-ink-soft">
          <div className="flex items-center gap-2 font-medium text-ink">
            <Sparkles size={15} className="text-primary-600" />
            Escolha guiada
          </div>
          <p className="mt-1 text-xs text-ink-muted">Seleciona uma opção para desbloquear o próximo passo.</p>
        </div>
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

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-ink-muted">
          {selected ? (
            <span>
              Serviço selecionado: <strong className="text-ink">{selected.name}</strong>
            </span>
          ) : (
            'Seleciona um serviço para continuar.'
          )}
        </div>
        <Button disabled={!selected} onClick={() => setStep(1)}>
          Continuar
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  )
}
