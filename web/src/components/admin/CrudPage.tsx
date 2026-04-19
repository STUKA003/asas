import { useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodSchema } from 'zod'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface CrudPageProps<T extends FieldValues, R> {
  title: string
  subtitle?: string
  queryKey: string
  summary?: ReactNode
  api: {
    list: () => Promise<R[]>
    create: (data: T) => Promise<R>
    update: (id: string, data: T) => Promise<R>
    remove: (id: string) => Promise<unknown>
  }
  columns: Column<R>[]
  schema: ZodSchema<T>
  defaultValues: DefaultValues<T>
  formFields: (
    register: ReturnType<typeof useForm<T>>['register'],
    errors: Record<string, { message?: string }>,
    form: Pick<ReturnType<typeof useForm<T>>, 'watch' | 'setValue' | 'reset'>
  ) => ReactNode
  getId: (row: R) => string
  getDefaults: (row: R) => DefaultValues<T>
}

export function CrudPage<T extends FieldValues, R>({
  title, subtitle, queryKey, summary, api, columns, schema, defaultValues, formFields, getId, getDefaults,
}: CrudPageProps<T, R>) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<R | null>(null)

  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: api.list })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<T>({ resolver: zodResolver(schema) })

  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] })
  const close = () => { setOpen(false); setEditing(null) }

  const createMutation = useMutation({ mutationFn: api.create, onSuccess: () => { invalidate(); close() } })
  const updateMutation = useMutation({ mutationFn: (d: T) => api.update(getId(editing!), d), onSuccess: () => { invalidate(); close() } })
  const removeMutation = useMutation({ mutationFn: api.remove, onSuccess: invalidate })

  const openCreate = () => { setEditing(null); reset(defaultValues); setOpen(true) }
  const openEdit   = (row: R) => { setEditing(row); reset(getDefaults(row)); setOpen(true) }
  const onSubmit   = (d: T) => editing ? updateMutation.mutate(d) : createMutation.mutate(d)

  const count = (data as R[]).length
  const typedErrors = errors as Record<string, { message?: string }>
  const submitError =
    typeof createMutation.error === 'object' &&
    createMutation.error !== null &&
    'response' in createMutation.error &&
    typeof (createMutation.error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ? (createMutation.error as { response?: { data?: { error?: string } } }).response!.data!.error!
      : typeof updateMutation.error === 'object' &&
          updateMutation.error !== null &&
          'response' in updateMutation.error &&
          typeof (updateMutation.error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
        ? (updateMutation.error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : createMutation.error instanceof Error
          ? createMutation.error.message
          : updateMutation.error instanceof Error
            ? updateMutation.error.message
            : null

  const singularTitle = title.replace(/s$/, '')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {subtitle ?? `${count} ${singularTitle.toLowerCase()}${count !== 1 ? 's' : ''} registado${count !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
            <Plus size={15} />
            Novo {singularTitle}
          </Button>
        </div>

        {summary}

        <Card>
          <CardContent className="pt-0 px-0 pb-0">
            <DataTable<R>
              loading={isLoading}
              data={data as R[]}
              keyExtractor={getId}
              columns={columns}
              actions={(row) => (
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    onClick={() => openEdit(row)}
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500"
                    onClick={() => confirm('Remover?') && removeMutation.mutate(getId(row))}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <Modal open={open} onClose={close} title={editing ? `Editar ${singularTitle}` : `Novo ${singularTitle}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formFields(register as ReturnType<typeof useForm<T>>['register'], typedErrors, { watch, setValue, reset })}
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {submitError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Guardar alterações' : `Criar ${singularTitle}`}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  )
}
