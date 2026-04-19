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
    <div className="overflow-x-auto -mx-6">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-6 py-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-widest',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
            {actions && (
              <th className="px-6 py-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
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
                'border-b border-zinc-50 dark:border-zinc-800/50 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30',
                idx === data.length - 1 && 'border-b-0'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-6 py-3.5 text-sm text-zinc-700 dark:text-zinc-300', col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
              {actions && (
                <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
