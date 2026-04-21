import { useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodSchema } from 'zod'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/layout/PanelShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { Plus } from 'lucide-react'

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
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<R | null>(null)

  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: api.list })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<T>({ resolver: zodResolver(schema) })

  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] })
  const close      = () => { setOpen(false); setEditing(null) }

  const createMutation = useMutation({ mutationFn: api.create,                              onSuccess: () => { invalidate(); close() } })
  const updateMutation = useMutation({ mutationFn: (d: T) => api.update(getId(editing!), d), onSuccess: () => { invalidate(); close() } })
  const removeMutation = useMutation({ mutationFn: api.remove, onSuccess: invalidate })

  const openCreate = () => { setEditing(null); reset(defaultValues); setOpen(true) }
  const openEdit   = (row: R) => { setEditing(row); reset(getDefaults(row)); setOpen(true) }
  const onSubmit   = (d: T) => editing ? updateMutation.mutate(d) : createMutation.mutate(d)

  const count        = (data as R[]).length
  const singularTitle = title.replace(/s$/, '')
  const typedErrors  = errors as Record<string, { message?: string }>

  const submitError =
    typeof createMutation.error === 'object' && createMutation.error !== null && 'response' in createMutation.error &&
    typeof (createMutation.error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ? (createMutation.error as { response?: { data?: { error?: string } } }).response!.data!.error!
      : typeof updateMutation.error === 'object' && updateMutation.error !== null && 'response' in updateMutation.error &&
        typeof (updateMutation.error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (updateMutation.error as { response?: { data?: { error?: string } } }).response!.data!.error!
          : createMutation.error instanceof Error ? createMutation.error.message
          : updateMutation.error instanceof Error ? updateMutation.error.message
          : null

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={title}
          subtitle={subtitle ?? `${count} ${singularTitle.toLowerCase()}${count !== 1 ? 's' : ''} registado${count !== 1 ? 's' : ''}`}
          actions={
            <Button onClick={openCreate} size="sm">
              <Plus size={14} />
              Novo {singularTitle}
            </Button>
          }
        />

        {summary}

        <Card>
          <CardContent className="p-0">
            <DataTable<R>
              loading={isLoading}
              data={data as R[]}
              keyExtractor={getId}
              columns={columns}
              actions={(row) => (
                <DataTable.RowActions
                  onEdit={() => openEdit(row)}
                  onDelete={() => confirm('Remover?') && removeMutation.mutate(getId(row))}
                />
              )}
            />
          </CardContent>
        </Card>
      </div>

      <Modal open={open} onClose={close} title={editing ? `Editar ${singularTitle}` : `Novo ${singularTitle}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formFields(register as ReturnType<typeof useForm<T>>['register'], typedErrors, { watch, setValue, reset })}
          {submitError && (
            <div className="rounded-xl border border-danger-200/70 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
              {submitError}
            </div>
          )}
          <div className="flex justify-end gap-2.5 border-t border-neutral-100 pt-4">
            <Button type="button" variant="secondary" onClick={close}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Guardar' : `Criar ${singularTitle}`}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  )
}
