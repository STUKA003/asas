import { type ReactNode, type WheelEvent as ReactWheelEvent, useRef } from 'react'
import { cn, redirectVerticalWheelToParent } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SkeletonTableRows } from '@/components/ui/Skeleton'
import { Pencil, SearchX, Trash2 } from 'lucide-react'

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
  emptyDescription?: string
  actions?: (row: T) => ReactNode
}

function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {onEdit && (
        <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 w-8 p-0 text-ink-muted hover:text-ink">
          <Pencil size={13} />
        </Button>
      )}
      {onDelete && (
        <Button size="sm" variant="ghost" onClick={onDelete} className="h-8 w-8 p-0 text-ink-muted hover:text-danger-600">
          <Trash2 size={13} />
        </Button>
      )}
    </div>
  )
}

export function DataTable<T>({
  columns, data, loading, keyExtractor, onRowClick,
  emptyMessage, emptyDescription, actions,
}: DataTableProps<T>) {
  const tableScrollRef = useRef<HTMLDivElement>(null)

  if (loading) {
    return <SkeletonTableRows rows={5} cols={columns.length + (actions ? 1 : 0)} />
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
          <SearchX size={20} className="text-ink-muted" />
        </div>
        <div className="text-center">
          <p className="text-[13.5px] font-medium text-ink">
            {emptyMessage ?? 'Sem resultados'}
          </p>
          {emptyDescription && (
            <p className="mt-1 text-[12.5px] text-ink-muted">{emptyDescription}</p>
          )}
        </div>
      </div>
    )
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    redirectVerticalWheelToParent(event, tableScrollRef.current)
  }

  return (
    <>
      {/* ── Mobile cards ─────────────────────────────── */}
      <div className="space-y-2.5 p-4 md:hidden">
        {data.map((row) => (
          <article
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'rounded-2xl border border-neutral-200/70 bg-white p-4',
              'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
              onRowClick && 'cursor-pointer transition-all duration-150 hover:border-neutral-300 hover:shadow-medium'
            )}
          >
            <div className="space-y-3">
              {columns.map((col, index) => (
                <div key={col.key} className={cn('grid gap-1', index === 0 && 'border-b border-neutral-100 pb-3')}>
                  <p className="text-[11px] font-medium text-ink-muted">
                    {col.label}
                  </p>
                  <div className={cn('text-[13.5px] text-ink-soft', col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </div>
                </div>
              ))}
            </div>
            {actions && (
              <div className="mt-3 flex items-center justify-end border-t border-neutral-100 pt-3" onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* ── Desktop table ─────────────────────────────── */}
      <div className="hidden overflow-hidden md:block">
        <div ref={tableScrollRef} onWheel={handleWheel} className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/60">
                {columns.map((col) => (
                  <th key={col.key} className={cn('px-6 py-3 text-left text-[12px] font-medium text-ink-muted', col.className)}>
                    {col.label}
                  </th>
                ))}
                {actions && (
                  <th className="px-6 py-3 text-right text-[12px] font-medium text-ink-muted">
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
                    'border-b border-neutral-100 transition-colors duration-100',
                    idx === data.length - 1 && 'border-b-0',
                    onRowClick ? 'cursor-pointer hover:bg-neutral-50/80' : 'hover:bg-neutral-50/40'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-6 py-3.5 text-[13.5px] text-ink-soft', col.className)}>
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
      </div>
    </>
  )
}

DataTable.RowActions = RowActions
