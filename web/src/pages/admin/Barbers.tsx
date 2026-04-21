import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { barbersApi, barbersPasswordApi, barbershopApi } from '@/lib/api'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { DataTable } from '@/components/admin/DataTable'
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Barber } from '@/lib/types'

const schema = z.object({
  name:   z.string().min(2),
  email:  z.string().email().optional().or(z.literal('')),
  phone:  z.string().optional(),
  active: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

const passwordSchema = z.object({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords não coincidem', path: ['confirm'] })
type PasswordFormData = z.infer<typeof passwordSchema>

export default function Barbers() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen]     = useState(false)
  const [accessModal, setAccessModal] = useState<Barber | null>(null)
  const [editing, setEditing]         = useState<Barber | null>(null)
  const [mutationError, setMutationError] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barbersApi.list() as Promise<Barber[]>,
  })

  const { data: barbershop } = useQuery({ queryKey: ['barbershop'], queryFn: barbershopApi.get })
  const maxBarbers    = barbershop?.subscription?.limits?.maxBarbers ?? null
  const activeBarbers = barbershop?.subscription?.limits?.activeBarbers ?? data.filter(b => b.active).length
  const atLimit       = maxBarbers !== null && activeBarbers >= maxBarbers

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const {
    register: regPw, handleSubmit: handlePw, reset: resetPw,
    formState: { errors: pwErrors, isSubmitting: pwPending },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['barbers'] })
    qc.invalidateQueries({ queryKey: ['barbershop'] })
  }

  const onMutationError = (err: unknown) => {
    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    setMutationError(msg ?? 'Ocorreu um erro.')
  }

  const create  = useMutation({ mutationFn: (d: FormData)  => barbersApi.create(d),              onSuccess: () => { invalidate(); closeModal() }, onError: onMutationError })
  const update  = useMutation({ mutationFn: (d: FormData)  => barbersApi.update(editing!.id, d), onSuccess: () => { invalidate(); closeModal() }, onError: onMutationError })
  const remove  = useMutation({ mutationFn: (id: string)   => barbersApi.remove(id),             onSuccess: invalidate })
  const [accessError, setAccessError] = useState('')
  const setPass = useMutation({
    mutationFn: ({ id, pw }: { id: string; pw: string | null }) => barbersPasswordApi.set(id, pw),
    onSuccess: () => { invalidate(); setAccessModal(null); setAccessError('') },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAccessError(msg ?? 'Erro ao guardar. Verifica se o servidor está atualizado.')
    },
  })

  const openCreate = () => { setEditing(null); reset({}); setMutationError(''); setModalOpen(true) }
  const openEdit   = (b: Barber) => { setEditing(b); reset(b); setMutationError(''); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null); setMutationError('') }

  const onSubmit   = (d: FormData) => editing ? update.mutate(d) : create.mutate(d)
  const onSetPass  = (d: PasswordFormData) => setPass.mutate({ id: accessModal!.id, pw: d.password })
  const onRevoke   = () => setPass.mutate({ id: accessModal!.id, pw: null })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Barbeiros</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {activeBarbers} ativo{activeBarbers !== 1 ? 's' : ''}
              {maxBarbers !== null && ` de ${maxBarbers}`}
              {' · '}{data.length} cadastrado{data.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={openCreate} disabled={atLimit} className="gap-2">
            <Plus size={16} /> Novo barbeiro
          </Button>
        </div>

        {atLimit && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">
              Atingiste o limite de <strong>{maxBarbers} barbeiro{maxBarbers !== 1 ? 's' : ''} ativo{maxBarbers !== 1 ? 's' : ''}</strong> do teu plano.
            </span>
            <Link to="/admin/billing" className="shrink-0 font-semibold underline hover:no-underline">
              Fazer upgrade
            </Link>
          </div>
        )}

        <Card>
          <CardContent className="pt-6">
            <DataTable<Barber>
              loading={isLoading}
              data={data}
              keyExtractor={(b) => b.id}
              columns={[
                {
                  key: 'name', label: 'Barbeiro',
                  render: (b) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={b.name} src={b.avatar} size="sm" />
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-zinc-400">{b.email ?? '-'}</p>
                      </div>
                    </div>
                  ),
                },
                { key: 'phone', label: 'Telefone', render: (b) => b.phone ?? '-' },
                {
                  key: 'active', label: 'Status',
                  render: (b) => b.active
                    ? <Badge>Ativo</Badge>
                    : <span className="text-xs text-zinc-400">Inativo</span>,
                },
                {
                  key: 'access', label: 'Acesso portal',
                  render: (b) => (b as Barber & { hasAccess?: boolean }).hasAccess
                    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><ShieldCheck size={12} /> Ativo</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-zinc-400"><ShieldOff size={12} /> Sem acesso</span>,
                },
              ]}
              actions={(b) => (
                <div className="flex items-center gap-2 justify-end">
                  <Button size="sm" variant="ghost" title="Gerir acesso ao portal"
                    onClick={() => { setAccessModal(b); resetPw() }}>
                    <KeyRound size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600"
                    onClick={() => confirm('Remover barbeiro?') && remove.mutate(b.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* Modal criar/editar barbeiro */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar barbeiro' : 'Novo barbeiro'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mutationError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{mutationError}</span>
            </div>
          )}
          <Input label="Nome" placeholder="Joao Silva" error={errors.name?.message} {...register('name')} />
          <Input label="E-mail" type="email" placeholder="joao@example.com" error={errors.email?.message} {...register('email')} />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                label="Telefone"
                placeholder="912 345 678"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {editing && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded accent-orange-500" {...register('active')} />
              Barbeiro ativo
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal gerir acesso ao portal */}
      <Modal open={!!accessModal} onClose={() => setAccessModal(null)} title="Acesso ao portal">
        {accessModal && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <Avatar name={accessModal.name} src={accessModal.avatar} size="sm" />
              <div>
                <p className="font-medium text-sm">{accessModal.name}</p>
                <p className="text-xs text-zinc-400">{accessModal.email ?? 'Sem e-mail definido'}</p>
              </div>
            </div>

            {!accessModal.email && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                Este barbeiro não tem e-mail definido. Adiciona um e-mail antes de activar o acesso.
              </div>
            )}

            {accessError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{accessError}</span>
              </div>
            )}

            <form onSubmit={handlePw(onSetPass)} className="space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Define uma password para o barbeiro aceder ao portal em{' '}
                <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  /barber/login
                </code>
              </p>
              <Input
                label="Nova password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                error={pwErrors.password?.message}
                disabled={!accessModal.email}
                {...regPw('password')}
              />
              <Input
                label="Confirmar password"
                type="password"
                placeholder="Repetir password"
                error={pwErrors.confirm?.message}
                disabled={!accessModal.email}
                {...regPw('confirm')}
              />
              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  loading={setPass.isPending}
                  onClick={onRevoke}
                >
                  <ShieldOff size={14} className="mr-1.5" /> Revogar acesso
                </Button>
                <Button type="submit" loading={pwPending} disabled={!accessModal.email}>
                  <ShieldCheck size={14} className="mr-1.5" /> Activar acesso
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
