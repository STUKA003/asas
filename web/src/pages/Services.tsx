import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { ArrowRight, Clock } from 'lucide-react'
import type { Service } from '@/lib/types'

export default function Services() {
  const { slug, barbershop } = useTenant()

  const { data: services, isLoading } = useQuery({
    queryKey: ['public', slug, 'services'],
    queryFn:  () => publicApi(slug).services(),
    enabled:  !!slug,
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="border-b border-neutral-100 bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow mb-3 tenant-ink">Catálogo</p>
            <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.4rem]">
              Serviços disponíveis
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-ink-muted">
              Escolha o serviço ideal — veja preços, duração e agende diretamente.
            </p>
          </div>
        </div>

        {/* ── Services grid ────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(services as Service[] | undefined)?.map((s) => (
                <div
                  key={s.id}
                  className="tenant-card group rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {/* Icon */}
                  <div className="tenant-soft-icon mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
                    <span className="text-[15px] font-bold">{s.name[0]}</span>
                  </div>

                  {/* Name + description */}
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">{s.name}</h3>
                  {s.description && (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-muted">{s.description}</p>
                  )}

                  {/* Price + CTA */}
                  <div className="mt-5 flex items-end justify-between border-t border-neutral-100 pt-4">
                    <div>
                      <p className="tenant-ink text-[22px] font-bold tracking-tight">
                        {formatCurrency(s.price)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-muted">
                        <Clock size={11} /> {formatDuration(s.duration)}
                      </p>
                    </div>
                    <Link to={`/${slug}/booking`}>
                      <Button size="sm" variant="secondary" className="gap-1.5">
                        Agendar <ArrowRight size={13} />
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
