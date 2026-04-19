import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { Clock, ChevronRight, Scissors } from 'lucide-react'
import type { Service } from '@/lib/types'

export default function Services() {
  const { slug, barbershop } = useTenant()

  const { data: services, isLoading } = useQuery({
    queryKey: ['public', slug, 'services'],
    queryFn:  () => publicApi(slug).services(),
    enabled:  !!slug,
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              {barbershop?.logoUrl ? (
                <img src={barbershop.logoUrl} alt={barbershop.name} className="h-16 w-auto max-w-[10rem] object-contain" />
              ) : (
                <div className="tenant-button flex h-14 w-14 items-center justify-center rounded-2xl">
                  <Scissors size={22} className="text-white" />
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Marca</p>
                <p className="font-semibold">{barbershop?.name ?? 'Trimio'}</p>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold">Nossos serviços</h1>
            <p className="text-zinc-500 mt-2">Escolha o serviço ideal para você.</p>
          </div>

          {isLoading ? <PageLoader /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(services as Service[] | undefined)?.map((s) => (
                <div key={s.id} className="group tenant-card rounded-2xl p-6 transition-all hover:-translate-y-0.5">
                  <div className="tenant-soft-icon mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                    <span className="font-bold text-lg">{s.name[0]}</span>
                  </div>
                  <h3 className="font-bold text-lg">{s.name}</h3>
                  {s.description && <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{s.description}</p>}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800">
                    <div>
                      <p className="tenant-ink text-xl font-black">{formatCurrency(s.price)}</p>
                      <p className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                        <Clock size={11} /> {formatDuration(s.duration)}
                      </p>
                    </div>
                    <Link to={`/${slug}/booking`}>
                      <Button size="sm" variant="outline" className="group-hover:tenant-button transition-all">
                        Agendar <ChevronRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
