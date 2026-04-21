import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { SearchX } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  actions?: (row: T) => ReactNode
}

export function DataTable<T>({ columns, data, loading, keyExtractor, onRowClick, emptyMessage, actions }: DataTableProps<T>) {
  if (loading) return (
    <div className="flex justify-center py-16"><Spinner /></div>
  )

  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <SearchX size={22} className="text-zinc-400" />
      </div>
      <p className="text-sm text-zinc-400">{emptyMessage ?? 'Nenhum item encontrado.'}</p>
    </div>
  )

  return (
    <>
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <article
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft',
              onRowClick && 'cursor-pointer transition hover:border-primary-200 hover:shadow-medium'
            )}
          >
            <div className="space-y-3">
              {columns.map((col, index) => (
                <div
                  key={col.key}
                  className={cn(
                    'grid gap-1.5',
                    index === 0 ? 'border-b border-neutral-200 pb-3' : ''
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                    {col.label}
                  </p>
                  <div className={cn('text-sm text-ink-soft', col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </div>
                </div>
              ))}
            </div>

            {actions && (
              <div
                className="mt-4 flex items-center justify-end border-t border-neutral-200 pt-3"
                onClick={(e) => e.stopPropagation()}
              >
                {actions(row)}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-neutral-50">
            <tr className="border-b border-neutral-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-ink-muted',
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-neutral-100 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-primary-50/40',
                  idx === data.length - 1 && 'border-b-0'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-6 py-4 text-sm text-ink-soft', col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  )
}
