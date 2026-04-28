import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import type { CustomerSummaryItem, RankItem } from './Reports.types'

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  helper,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone: string
  helper?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={18} />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-zinc-500">{label}</p>
        {helper ? <p className="mt-2 text-xs text-zinc-400">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}

export function RankList({
  title,
  icon: Icon,
  items,
  accent,
  empty,
  saleLabel = 'sales',
}: {
  title: string
  icon: LucideIcon
  items: RankItem[]
  accent: string
  empty: string
  saleLabel?: string
}) {
  const max = items[0]?.count ?? 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon size={16} className={accent} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">{empty}</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={item.id}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-zinc-400">{item.count} {saleLabel}</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-2 rounded-full ${accent.replace('text-', 'bg-')}`}
                  style={{ width: `${Math.max(6, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function CompactList({
  title,
  items,
  empty,
  renderRight,
}: {
  title: string
  items: CustomerSummaryItem[]
  empty: string
  renderRight: (item: CustomerSummaryItem) => string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
              </div>
              <span className="shrink-0 text-xs text-zinc-500">{renderRight(item)}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
