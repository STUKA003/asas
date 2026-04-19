import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addMonths, addYears, isPast } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Search, Scissors, Calendar, Users, Ban, CheckCircle, ChevronDown, ChevronUp, Plus, Trash2, LogIn, AlertTriangle } from 'lucide-react'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'
import { superadminApi } from '@/lib/api'
import { useSuperAuthStore } from '@/store/superauth'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'

type Plan = 'FREE' | 'BASIC' | 'PRO'

const PLAN_STYLES: Record<Plan, { badge: string; dot: string; activeButton: string; button: string }> = {
  FREE:  { badge: 'bg-zinc-800 text-zinc-300', dot: 'bg-zinc-500', activeButton: 'ring-2 ring-zinc-400 bg-zinc-700 text-zinc-200', button: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200' },
  BASIC: { badge: 'bg-blue-900/60 text-blue-300', dot: 'bg-blue-400', activeButton: 'ring-2 ring-blue-400 bg-blue-800 text-blue-100', button: 'bg-blue-800 hover:bg-blue-700 text-blue-100' },
  PRO:   { badge: 'bg-amber-900/60 text-amber-300', dot: 'bg-amber-400', activeButton: 'ring-2 ring-amber-400 bg-amber-700 text-amber-100', button: 'bg-amber-700 hover:bg-amber-600 text-amber-100' },
}
const PLAN_LABELS: Record<Plan, string> = { FREE: 'Grátis', BASIC: 'Básico', PRO: 'Pro' }
const ALL_PLANS: Plan[] = ['FREE', 'BASIC', 'PRO']

const QUICK_DURATIONS = [
  { label: '1 mês',   getDate: () => addMonths(new Date(), 1) },
  { label: '3 meses', getDate: () => addMonths(new Date(), 3) },
  { label: '6 meses', getDate: () => addMonths(new Date(), 6) },
  { label: '1 ano',   getDate: () => addYears(new Date(), 1) },
]

interface Barbershop {
  id: string
  name: string
  slug: string
  phone?: string
  subscriptionPlan: Plan
  subscriptionEndsAt?: string | null
  suspended: boolean
  suspendedReason?: string | null
  createdAt: string
  _count: { barbers: number; bookings: number; customers: number }
}

interface PlanEditorProps { b: Barbershop; token: string; onDone: () => void }
interface IdentityEditorProps { b: Barbershop; token: string; onDone: () => void }

function IdentityEditor({ b, token, onDone }: IdentityEditorProps) {
  const qc = useQueryClient()
  const [name, setName] = useState(b.name)
  const [slug, setSlug] = useState(b.slug)
  const [slugManual, setSlugManual] = useState(true)
  const [error, setError] = useState('')

  const updateMutation = useMutation({
    mutationFn: () => superadminApi.updateBarbershop(token, b.id, { name: name.trim(), slug: slug.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); onDone() },
    onError: (err: unknown) => {
      const message = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { error?: string | { fieldErrors?: Record<string, string[]> } } } }).response?.data?.error
        : undefined
      if (typeof message === 'string') { setError(message); return }
      const fieldErrors = typeof message === 'object' && message?.fieldErrors ? message.fieldErrors : undefined
      if (fieldErrors?.slug?.[0]) { setError(fieldErrors.slug[0]); return }
      if (fieldErrors?.name?.[0]) { setError(fieldErrors.name[0]); return }
      setError('Erro ao guardar alterações')
    },
  })

  function handleNameChange(value: string) {
    setName(value)
    if (!slugManual) setSlug(slugify(value))
  }

  const inputClass = 'w-full h-10 px-3 rounded-xl bg-zinc-800 border border-zinc-600 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-500'

  return (
    <div className="mt-4 pt-4 border-t border-zinc-700 space-y-4">
      <div>
        <p className="text-xs text-zinc-500 mb-2">Nome da barbearia</p>
        <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} className={inputClass} placeholder="Nome da barbearia" />
      </div>
      <div>
        <p className="text-xs text-zinc-500 mb-2">Slug do site</p>
        <div className="flex items-center rounded-xl border border-zinc-600 bg-zinc-800 focus-within:ring-2 focus-within:ring-accent-500 overflow-hidden">
          <span className="pl-3 pr-1 text-zinc-500 text-xs whitespace-nowrap select-none">/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => { setSlugManual(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
            className="flex-1 h-10 pr-3 bg-transparent text-sm text-white focus:outline-none"
            placeholder="nome-da-barbearia"
          />
        </div>
        <button onClick={() => { setSlugManual(false); setSlug(slugify(name)) }} className="mt-1.5 text-xs text-accent-300 hover:text-accent-200 transition-colors">
          Gerar slug a partir do nome
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !name.trim() || !slug.trim()} className="px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold transition-colors disabled:opacity-50">
          {updateMutation.isPending ? 'A guardar…' : 'Guardar'}
        </button>
        <button onClick={onDone} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors">Cancelar</button>
      </div>
    </div>
  )
}

function PlanEditor({ b, token, onDone }: PlanEditorProps) {
  const qc = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<Plan>(b.subscriptionPlan)
  const [endsAt, setEndsAt] = useState<string>(b.subscriptionEndsAt ? b.subscriptionEndsAt.slice(0, 10) : '')

  const updatePlan = useMutation({
    mutationFn: () => superadminApi.updateSubscription(token, b.id, {
      plan: selectedPlan,
      endsAt: selectedPlan !== 'FREE' && endsAt ? new Date(endsAt + 'T23:59:59').toISOString() : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); onDone() },
  })

  return (
    <div className="mt-4 pt-4 border-t border-zinc-700 space-y-4">
      <div>
        <p className="text-xs text-zinc-500 mb-2">Selecionar plano</p>
        <div className="flex gap-2 flex-wrap">
          {ALL_PLANS.map((p) => (
            <button key={p} onClick={() => setSelectedPlan(p)} className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all', selectedPlan === p ? PLAN_STYLES[p].activeButton : PLAN_STYLES[p].button)}>
              {PLAN_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {selectedPlan !== 'FREE' && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Data de expiração</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {QUICK_DURATIONS.map((d) => (
              <button key={d.label} onClick={() => setEndsAt(format(d.getDate(), 'yyyy-MM-dd'))} className="px-3 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                {d.label}
              </button>
            ))}
          </div>
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-9 px-3 rounded-xl bg-zinc-800 border border-zinc-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500" />
          {endsAt && <p className="text-xs text-zinc-500 mt-1">Expira em {format(new Date(endsAt), "d 'de' MMMM yyyy", { locale: pt })}</p>}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={() => updatePlan.mutate()} disabled={updatePlan.isPending} className="px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold transition-colors disabled:opacity-50">
          {updatePlan.isPending ? 'A guardar…' : 'Guardar'}
        </button>
        <button onClick={onDone} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors">Cancelar</button>
      </div>
    </div>
  )
}

interface SuspendEditorProps { b: Barbershop; token: string; onDone: () => void }

function SuspendEditor({ b, token, onDone }: SuspendEditorProps) {
  const qc = useQueryClient()
  const [reason, setReason] = useState(b.suspendedReason ?? '')

  const suspendMutation = useMutation({
    mutationFn: (suspended: boolean) => superadminApi.suspend(token, b.id, { suspended, reason: suspended ? reason : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); onDone() },
  })

  if (b.suspended) {
    return (
      <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center gap-3">
        <p className="text-xs text-red-400 flex-1">Suspensa: {b.suspendedReason || 'sem motivo'}</p>
        <button onClick={() => suspendMutation.mutate(false)} disabled={suspendMutation.isPending} className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold transition-colors disabled:opacity-50">
          {suspendMutation.isPending ? '…' : 'Reativar'}
        </button>
        <button onClick={onDone} className="text-xs text-zinc-500 hover:text-zinc-300">Fechar</button>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-zinc-700 space-y-3">
      <p className="text-xs text-zinc-400">Motivo da suspensão (opcional)</p>
      <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: pagamento em atraso" className="w-full h-9 px-3 rounded-xl bg-zinc-800 border border-zinc-600 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={() => suspendMutation.mutate(true)} disabled={suspendMutation.isPending} className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-red-100 text-xs font-semibold transition-colors disabled:opacity-50">
          {suspendMutation.isPending ? 'A suspender…' : 'Suspender'}
        </button>
        <button onClick={onDone} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors">Cancelar</button>
      </div>
    </div>
  )
}

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function CreateModal({ token, onClose }: { token: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ barbershopName: '', slug: '', adminName: '', adminEmail: '', adminPassword: '', plan: 'FREE' as Plan })
  const [slugManual, setSlugManual] = useState(false)
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: () => superadminApi.createBarbershop(token, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); onClose() },
    onError: (err: unknown) => {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Erro ao criar barbearia'
        : 'Erro ao criar barbearia'
      setError(msg === 'Slug already taken' ? 'Este endereço já está em uso.' : msg)
    },
  })

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    if (k === 'barbershopName' && !slugManual) setForm((f) => ({ ...f, barbershopName: v, slug: slugify(v) }))
  }

  const field = 'w-full h-10 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-500'

  return (
    <Modal open onClose={onClose} title="Nova barbearia" size="md">
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs text-zinc-400">Nome da barbearia</label>
          <input className={field} placeholder="Barbearia do João" value={form.barbershopName} onChange={(e) => set('barbershopName', e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-400">Endereço (slug)</label>
          <div className="flex items-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 focus-within:ring-2 focus-within:ring-accent-500">
            <span className="pl-3 pr-1 text-[11px] text-zinc-500 select-none sm:text-xs">trimio.app/</span>
            <input
              className="h-10 min-w-0 flex-1 pr-3 bg-transparent text-sm text-white focus:outline-none"
              value={form.slug}
              onChange={(e) => { setSlugManual(true); setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })) }}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">Nome do admin</label>
            <input className={field} placeholder="João Silva" value={form.adminName} onChange={(e) => set('adminName', e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">E-mail do admin</label>
            <input className={field} type="email" placeholder="joao@email.com" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-400">Password</label>
          <input className={field} type="password" placeholder="Mínimo 6 caracteres" value={form.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-400">Plano inicial</label>
          <div className="grid grid-cols-3 gap-2">
            {ALL_PLANS.map((p) => (
              <button
                key={p}
                onClick={() => setForm((f) => ({ ...f, plan: p }))}
                className={cn('rounded-xl py-2 text-xs font-semibold transition-all', form.plan === p ? PLAN_STYLES[p].activeButton : PLAN_STYLES[p].button)}
              >
                {PLAN_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-800 bg-red-900/20 px-3 py-2">
            <AlertTriangle size={13} className="shrink-0 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !form.barbershopName || !form.slug || !form.adminName || !form.adminEmail || !form.adminPassword}
          className="mt-1 w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
        >
          {createMutation.isPending ? 'A criar…' : 'Criar barbearia'}
        </button>
      </div>
    </Modal>
  )
}

export default function SuperAdminBarbershops() {
  const qc = useQueryClient()
  const { token } = useSuperAuthStore()
  const { setAuth } = useAuthStore()
  const [q, setQ] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<'identity' | 'plan' | 'suspend' | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => superadminApi.deleteBarbershop(token!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); setConfirmDeleteId(null); setExpandedId(null) },
  })
  const supportSessionMutation = useMutation({
    mutationFn: (id: string) => superadminApi.createSupportSession(token!, id),
  })

  const { data: barbershops = [], isLoading } = useQuery<Barbershop[]>({
    queryKey: ['superadmin', 'barbershops', q],
    queryFn: () => superadminApi.listBarbershops(token!, q || undefined),
    enabled: !!token,
  })

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); setEditMode(null) }
    else { setExpandedId(id); setEditMode(null) }
  }

  async function openSupportSession(id: string) {
    const supportWindow = window.open('', '_blank')
    try {
      const data = await supportSessionMutation.mutateAsync(id)
      setAuth(data.token, data.user)
      if (supportWindow) { supportWindow.location.href = '/admin' }
      else { window.location.href = '/admin' }
    } catch {
      if (supportWindow) supportWindow.close()
    }
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Barbearias</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{barbershops.length} registadas</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600 sm:self-auto"
          >
            <Plus size={15} />
            Nova barbearia
          </button>
        </div>

        {showCreate && <CreateModal token={token!} onClose={() => setShowCreate(false)} />}

        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar barbearia…"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>

        {isLoading ? (
          <div className="text-zinc-500 text-sm text-center py-16">A carregar…</div>
        ) : barbershops.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <Scissors size={20} className="text-zinc-500" />
            </div>
            <p className="text-zinc-500 text-sm">Nenhuma barbearia encontrada.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {barbershops.map((b) => {
              const plan = b.subscriptionPlan as Plan
              const s = PLAN_STYLES[plan] ?? PLAN_STYLES.FREE
              const isExpanded = expandedId === b.id
              const expired = plan !== 'FREE' && b.subscriptionEndsAt && isPast(new Date(b.subscriptionEndsAt))

              return (
                <div
                  key={b.id}
                  className={cn(
                    'bg-zinc-900 rounded-2xl border transition-all',
                    b.suspended ? 'border-red-800/60' : isExpanded ? 'border-zinc-700' : 'border-zinc-800'
                  )}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                          b.suspended ? 'bg-red-900/40' : 'bg-zinc-800'
                        )}>
                          <Scissors size={17} className={b.suspended ? 'text-red-400' : 'text-zinc-400'} />
                        </div>

                        {/* Main info */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex flex-wrap items-center gap-2">
                            <p className="break-words font-semibold text-white sm:truncate">{b.name}</p>
                            {/* Plan badge */}
                            <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', s.badge)}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                              {PLAN_LABELS[plan]}
                            </span>
                            {b.suspended && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-900/60 text-red-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                Suspensa
                              </span>
                            )}
                            {expired && !b.suspended && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-900/60 text-orange-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                                Expirado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">/{b.slug}</p>

                          {/* Stats row */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-1.5">
                              <Users size={11} className="text-zinc-600" />
                              {b._count.customers} clientes
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar size={11} className="text-zinc-600" />
                              {b._count.bookings} agendamentos
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Scissors size={11} className="text-zinc-600" />
                              {b._count.barbers} barbeiro{b._count.barbers !== 1 ? 's' : ''}
                            </span>
                            {b.subscriptionEndsAt && plan !== 'FREE' && (
                              <span className={cn(expired ? 'text-orange-400' : 'text-zinc-600')}>
                                Expira: {format(new Date(b.subscriptionEndsAt), "d MMM yyyy", { locale: pt })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleExpand(b.id)}
                        className="shrink-0 p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors mt-0.5"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Expanded section */}
                    {isExpanded && (
                      <>
                        {editMode === null && (
                          <div className="mt-4 flex flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:flex-wrap">
                            <button
                              onClick={() => openSupportSession(b.id)}
                              disabled={supportSessionMutation.isPending}
                              className="flex items-center justify-center gap-1.5 rounded-lg bg-accent-500/15 px-3 py-2 text-xs font-medium text-accent-300 transition-colors hover:bg-accent-500/25 disabled:opacity-50 sm:justify-start"
                            >
                              <LogIn size={12} />
                              {supportSessionMutation.isPending ? 'A abrir…' : 'Entrar no painel'}
                            </button>
                            <button
                              onClick={() => setEditMode('identity')}
                              className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                            >
                              Editar nome / slug
                            </button>
                            <button
                              onClick={() => setEditMode('plan')}
                              className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                            >
                              Alterar plano
                            </button>
                            <button
                              onClick={() => setEditMode('suspend')}
                              className={cn(
                                'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:justify-start',
                                b.suspended
                                  ? 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300'
                                  : 'bg-red-900/20 hover:bg-red-900/40 text-red-400'
                              )}
                            >
                              {b.suspended
                                ? <><CheckCircle size={12} /> Reativar</>
                                : <><Ban size={12} /> Suspender</>}
                            </button>

                            {/* Delete */}
                            <div className="sm:ml-auto">
                              {confirmDeleteId === b.id ? (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <span className="text-xs text-zinc-400">Tens a certeza?</span>
                                  <button
                                    onClick={() => deleteMutation.mutate(b.id)}
                                    disabled={deleteMutation.isPending}
                                    className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                                  >
                                    {deleteMutation.isPending ? 'A apagar…' : 'Apagar'}
                                  </button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(b.id)}
                                  className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400 sm:justify-start"
                                >
                                  <Trash2 size={12} /> Apagar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {editMode === 'identity' && <IdentityEditor b={b} token={token!} onDone={() => setEditMode(null)} />}
                        {editMode === 'plan' && <PlanEditor b={b} token={token!} onDone={() => setEditMode(null)} />}
                        {editMode === 'suspend' && <SuspendEditor b={b} token={token!} onDone={() => setEditMode(null)} />}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  )
}
