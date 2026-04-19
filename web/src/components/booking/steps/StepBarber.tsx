import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { PageLoader } from '@/components/ui/Spinner'
import type { Barber } from '@/lib/types'

export function StepBarber() {
  const { slug } = useTenant()
  const { barber: selected, setBarber, setStep } = useBookingStore()

  const { data: barbers, isLoading } = useQuery({
    queryKey: ['public', slug, 'barbers'],
    queryFn:  () => publicApi(slug).barbers(),
    enabled:  !!slug,
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Escolha um barbeiro</h2>
        <p className="text-zinc-500 text-sm mt-1">Selecione quem irá te atender</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(barbers as Barber[] | undefined)?.map((b) => (
          <button
            key={b.id}
            onClick={() => setBarber(b)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all',
              selected?.id === b.id
                ? 'tenant-selected'
                : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
            )}
          >
            <Avatar name={b.name} src={b.avatar} size="lg" />
            <div className="text-left">
              <p className="font-semibold">{b.name}</p>
              <p className="text-sm text-zinc-400">{b.phone ?? 'Profissional'}</p>
            </div>
            {selected?.id === b.id && (
              <div className="tenant-button ml-auto flex h-6 w-6 items-center justify-center rounded-full">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
        <Button disabled={!selected} onClick={() => setStep(2)}>Próximo</Button>
      </div>
    </div>
  )
}
