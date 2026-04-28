import { useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodSchema } from 'zod'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/layout/PanelShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { useToast } from '@/components/ui/Toast'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'

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
  getName?: (row: R) => string
}

export function CrudPage<T extends FieldValues, R>({
  title, subtitle, queryKey, summary, api, columns, schema, defaultValues, formFields, getId, getDefaults, getName,
}: CrudPageProps<T, R>) {
  const qc = useQueryClient()
  const { success, error: showError } = useToast()
  const { t } = useTranslation('common')
  const [open, setOpen]             = useState(false)
  const [editing, setEditing]       = useState<R | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<R | null>(null)

  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: api.list })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<T>({ resolver: zodResolver(schema) })

  const singularTitle = title.replace(/s$/, '')

  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] })
  const close      = () => { setOpen(false); setEditing(null) }

  const createMutation = useMutation({
    mutationFn: api.create,
    onSuccess: () => { invalidate(); close(); success(`${singularTitle} criado com sucesso.`) },
    onError: () => showError(`Não foi possível criar o ${singularTitle.toLowerCase()}.`),
  })
  const updateMutation = useMutation({
    mutationFn: (d: T) => api.update(getId(editing!), d),
    onSuccess: () => { invalidate(); close(); success('Alterações guardadas.') },
    onError: () => showError('Não foi possível guardar as alterações.'),
  })
  const removeMutation = useMutation({
    mutationFn: api.remove,
    onSuccess: () => { invalidate(); setDeleteTarget(null); success(`${singularTitle} removido.`) },
    onError: () => showError(`Não foi possível remover o ${singularTitle.toLowerCase()}.`),
  })

  const openCreate = () => { setEditing(null); reset(defaultValues); setOpen(true) }
  const openEdit   = (row: R) => { setEditing(row); reset(getDefaults(row)); setOpen(true) }
  const onSubmit   = (d: T) => editing ? updateMutation.mutate(d) : createMutation.mutate(d)

  const count        = (data as R[]).length
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

  const targetName = deleteTarget ? (getName?.(deleteTarget) ?? singularTitle) : ''

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={title}
          subtitle={subtitle ?? `${count} ${singularTitle.toLowerCase()}${count !== 1 ? 's' : ''} registado${count !== 1 ? 's' : ''}`}
          actions={
            <Button onClick={openCreate} size="sm">
              <Plus size={14} />
              {t('btn.create')} {singularTitle}
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
              emptyMessage={`Nenhum${singularTitle.toLowerCase() !== singularTitle ? 'a' : ''} ${singularTitle.toLowerCase()} ainda`}
              emptyDescription={`Clica em "Novo ${singularTitle}" para adicionar o primeiro.`}
              actions={(row) => (
                <DataTable.RowActions
                  onEdit={() => openEdit(row)}
                  onDelete={() => setDeleteTarget(row)}
                />
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal open={open} onClose={close} title={editing ? `${t('btn.edit')} ${singularTitle}` : `${t('btn.create')} ${singularTitle}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formFields(register as ReturnType<typeof useForm<T>>['register'], typedErrors, { watch, setValue, reset })}
          {submitError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger-200/70 bg-danger-50 px-3.5 py-2.5">
              <AlertCircle size={15} className="mt-px shrink-0 text-danger-500" />
              <p className="text-[13px] text-danger-700">{submitError}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <Button type="button" variant="secondary" onClick={close}>{t('btn.cancel')}</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? t('btn.save') : `${t('btn.create')} ${singularTitle}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirmation modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar remoção" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-danger-100 bg-danger-50/60 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-100">
              <Trash2 size={15} className="text-danger-600" />
            </div>
            <div>
              <p className="text-[13.5px] font-medium text-ink">
                Remover {targetName.length > 40 ? targetName.slice(0, 40) + '…' : targetName}?
              </p>
              <p className="mt-1 text-[12.5px] text-ink-muted">
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t('btn.cancel')}</Button>
            <Button variant="danger" loading={removeMutation.isPending} onClick={() => deleteTarget && removeMutation.mutate(getId(deleteTarget))}>
              {t('btn.remove')}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
