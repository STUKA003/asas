import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { formatCurrency, cn } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { ShoppingCart, Package, Scissors, ChevronDown } from 'lucide-react'
import type { Product } from '@/lib/types'

export default function Products() {
  const { slug, barbershop } = useTenant()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: products, isLoading } = useQuery({
    queryKey: ['public', slug, 'products'],
    queryFn:  () => publicApi(slug).products(),
    enabled:  !!slug,
  })

  const unavailable = barbershop?.plan === 'FREE' || barbershop?.showProducts === false

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          {unavailable ? (
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-10 text-center">
              <h1 className="text-3xl font-extrabold">Produtos indisponíveis</h1>
              <p className="mt-3 text-zinc-500">Esta barbearia preferiu não mostrar produtos no site público neste momento.</p>
              <Link to={`/${slug}`} className="mt-6 inline-block">
                <Button>Voltar ao início</Button>
              </Link>
            </div>
          ) : (
            <>
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
            <h1 className="text-3xl sm:text-4xl font-extrabold">Produtos</h1>
            <p className="text-zinc-500 mt-2">Leve o cuidado profissional para casa.</p>
          </div>

          {isLoading ? <PageLoader /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(products as Product[] | undefined)?.map((p) => (
                <div key={p.id} className="tenant-card overflow-hidden rounded-2xl transition-all group hover:-translate-y-0.5">
                  <div className="h-48 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package size={40} className="text-zinc-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-semibold">{p.name}</h3>
                      {p.description && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="shrink-0 mt-0.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          <ChevronDown size={15} className={cn('transition-transform', expandedId === p.id && 'rotate-180')} />
                        </button>
                      )}
                    </div>
                    {p.description && (
                      <p className={cn('text-xs text-zinc-500 mt-1 leading-relaxed', expandedId !== p.id && 'line-clamp-2')}>
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <span className="tenant-ink text-lg font-black">{formatCurrency(p.price)}</span>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <ShoppingCart size={13} /> Adicionar
                      </Button>
                    </div>
                    {p.stock <= 5 && p.stock > 0 && (
                      <p className="text-xs text-orange-500 mt-2">Restam {p.stock} unidades</p>
                    )}
                    {p.stock === 0 && (
                      <p className="text-xs text-red-500 mt-2">Sem estoque</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
