import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { formatCurrency, cn } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { ChevronDown, Package } from 'lucide-react'
import type { Product } from '@/lib/types'

export default function Products() {
  const { slug, barbershop } = useTenant()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { t } = useTranslation('public')

  const { data: products, isLoading } = useQuery({
    queryKey: ['public', slug, 'products'],
    queryFn:  () => publicApi(slug).products(),
    enabled:  !!slug,
  })

  const unavailable = barbershop?.plan === 'FREE' || barbershop?.showProducts === false

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">

        {unavailable ? (
          <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
            <div className="ui-card p-10">
              <h1 className="text-[1.6rem] font-semibold tracking-tight text-ink">{t('products.unavailableTitle')}</h1>
              <p className="mt-3 text-[14px] text-ink-muted">{t('products.unavailableMsg')}</p>
              <Link to={`/${slug}`} className="mt-6 inline-block">
                <Button>{t('products.backHome')}</Button>
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* ── Page header ──────────────────────────────── */}
            <div className="border-b border-neutral-100 bg-white px-4 py-12 sm:px-6 sm:py-16">
              <div className="mx-auto max-w-6xl">
                <p className="eyebrow mb-3 tenant-ink">{t('products.eyebrow')}</p>
                <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.4rem]">
                  {t('products.title')}
                </h1>
                <p className="mt-2 text-[14px] leading-6 text-ink-muted">
                  {t('products.subtitle')}
                </p>
              </div>
            </div>

            {/* ── Products grid ────────────────────────────── */}
            <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
              {isLoading ? (
                <PageLoader />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {(products as Product[] | undefined)?.map((p) => (
                    <div
                      key={p.id}
                      className="tenant-card group overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex h-48 items-center justify-center bg-neutral-50">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package size={36} className="text-neutral-300" />
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-[14px] font-semibold text-ink">{p.name}</h3>
                          {p.description && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                              className="mt-0.5 shrink-0 text-ink-muted transition-colors hover:text-ink"
                            >
                              <ChevronDown
                                size={14}
                                className={cn('transition-transform duration-150', expandedId === p.id && 'rotate-180')}
                              />
                            </button>
                          )}
                        </div>

                        {p.description && (
                          <p className={cn('mt-1 text-[12.5px] leading-5 text-ink-muted', expandedId !== p.id && 'line-clamp-2')}>
                            {p.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                          <span className="tenant-ink text-[18px] font-bold tracking-tight">
                            {formatCurrency(p.price)}
                          </span>
                          <Button size="sm" variant="secondary" className="gap-1.5 text-[12px]">
                            {t('products.orderButton')}
                          </Button>
                        </div>

                        {p.stock <= 5 && p.stock > 0 && (
                          <p className="mt-2 text-[11.5px] text-warning-600">
                            {t('products.lowStock', { count: p.stock })}
                          </p>
                        )}
                        {p.stock === 0 && (
                          <p className="mt-2 text-[11.5px] text-danger-600">{t('products.outOfStock')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

      </main>
      <Footer />
    </div>
  )
}
