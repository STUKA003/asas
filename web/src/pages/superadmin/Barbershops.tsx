import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addMonths, addYears, isPast } from 'date-fns'
import type { Locale } from 'date-fns'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { getDateFnsLocale } from '@/i18n/dateFnsLocale'
import {
  Search, Scissors, Calendar, Users, Ban, CheckCircle,
  ChevronDown, ChevronUp, Plus, Trash2, LogIn, AlertTriangle,
  Mail, ShieldCheck, ShieldAlert, RotateCw, KeyRound, UserCheck,
} from 'lucide-react'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'
import { superadminApi } from '@/lib/api'
import { useSuperAuthStore } from '@/store/superauth'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { normalizeSlug, slugify } from '@/lib/slug'

type Plan = 'FREE' | 'BASIC' | 'PRO'

const PLAN_STYLES: Record<Plan, { badge: string; dot: string; activeButton: string; button: string }> = {
  FREE:  {
    badge:        'bg-white/[0.06] text-white/40',
    dot:          'bg-white/30',
    activeButton: 'ring-1 ring-white/20 bg-white/[0.10] text-white/70',
    button:       'bg-white/[0.05] text-white/45 hover:bg-white/[0.09] hover:text-white/65',
  },
  BASIC: {
    badge:        'bg-blue-500/15  text-blue-300',
    dot:          'bg-blue-400',
    activeButton: 'ring-1 ring-blue-400/50 bg-blue-500/20 text-blue-200',
    button:       'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
  },
  PRO:   {
    badge:        'bg-amber-500/15 text-amber-300',
    dot:          'bg-amber-400',
    activeButton: 'ring-1 ring-amber-400/50 bg-amber-500/20 text-amber-200',
    button:       'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
  },
}
const ALL_PLANS: Plan[] = ['FREE', 'BASIC', 'PRO']

function getPlanLabels(t: TFunction): Record<Plan, string> {
  return {
    FREE: t('superadmin:barbershops.plans.FREE'),
    BASIC: t('superadmin:barbershops.plans.BASIC'),
    PRO: t('superadmin:barbershops.plans.PRO'),
  }
}

function getQuickDurations(t: TFunction) {
  return [
    { label: t('superadmin:barbershops.durations.month1'),  getDate: () => addMonths(new Date(), 1) },
    { label: t('superadmin:barbershops.durations.months3'), getDate: () => addMonths(new Date(), 3) },
    { label: t('superadmin:barbershops.durations.months6'), getDate: () => addMonths(new Date(), 6) },
    { label: t('superadmin:barbershops.durations.year1'),   getDate: () => addYears(new Date(), 1) },
  ]
}

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
  stripeSubscriptionStatus?: string | null
  owner: { id: string; name: string; email: string; emailVerifiedAt?: string | null; createdAt: string } | null
  health: { subscriptionActive: boolean; suspended: boolean; unverifiedEmail: boolean; noPlan: boolean }
  security: {
    successLogins: number
    failedLogins: number
    passwordResetRequests: number
    latestLoginAt?: string | null
    latestFailedLoginAt?: string | null
    latestPasswordResetAt?: string | null
    recentEvents: Array<{ id: string; type: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'PASSWORD_RESET_REQUEST'; reason?: string | null; email?: string | null; createdAt: string }>
  }
  _count: { barbers: number; bookings: number; customers: number }
}

type VerificationFilter = 'all' | 'pending' | 'verified'
type HealthFilter = 'all' | 'active' | 'suspended' | 'unverified' | 'no-plan'

function formatSecurityDate(v?: string | null, locale?: Locale) {
  if (!v) return '—'
  return format(new Date(v), 'd MMM yyyy, HH:mm', locale ? { locale } : undefined)
}

const SECURITY_TONES = {
  neutral: 'bg-white/[0.05] text-white/50',
  good:    'bg-emerald-500/10 text-emerald-300',
  danger:  'bg-red-500/10 text-red-300',
  warn:    'bg-amber-500/10 text-amber-300',
}

function SecurityStat({ icon: Icon, label, value, tone = 'neutral' }: {
  icon: typeof Calendar; label: string; value: string | number; tone?: keyof typeof SECURITY_TONES
}) {
  return (
    <div className={cn('rounded-xl px-3 py-2.5', SECURITY_TONES[tone])}>
      <div className="flex items-center gap-1.5 text-[11px] opacity-75">
        <Icon size={11} /> {label}
      </div>
      <p className="mt-1.5 text-[13px] font-semibold text-white">{value}</p>
    </div>
  )
}

/* ── Dark input shared class ───────────────────────────────── */
const darkInput = 'h-10 w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-150 hover:border-white/[0.16] focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10'
const darkBtn   = 'rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-150 disabled:opacity-50'

/* ── Sub-editors ───────────────────────────────────────────── */
function IdentityEditor({ b, token, onDone, t }: { b: Barbershop; token: string; onDone: () => void; t: TFunction }) {
  const qc = useQueryClient()
  const [name, setName]           = useState(b.name)
  const [slug, setSlug]           = useState(b.slug)
  const [slugManual, setSlugManual] = useState(true)
  const [error, setError]         = useState('')

  const mut = useMutation({
    mutationFn: () => superadminApi.updateBarbershop(token, b.id, { name: name.trim(), slug: slug.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); onDone() },
    onError: (err: unknown) => {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { error?: string | { fieldErrors?: Record<string, string[]> } } } }).response?.data?.error
        : undefined
      if (typeof msg === 'string') { setError(msg); return }
      const fe = typeof msg === 'object' && msg?.fieldErrors ? msg.fieldErrors : undefined
      setError(fe?.slug?.[0] ?? fe?.name?.[0] ?? t('superadmin:barbershops.identity.errorSave'))
    },
  })

  return (
    <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
      <div className="space-y-1.5">
        <p className="text-[11px] text-white/35">{t('superadmin:barbershops.identity.shopName')}</p>
        <input className={darkInput} value={name} onChange={(e) => { setName(e.target.value); if (!slugManual) setSlug(slugify(e.target.value)) }} placeholder={t('superadmin:barbershops.identity.namePlaceholder')} />
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] text-white/35">{t('superadmin:barbershops.identity.siteSlug')}</p>
        <div className="flex items-center overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.06] focus-within:border-primary-500/50 focus-within:ring-4 focus-within:ring-primary-500/10">
          <span className="pl-3 pr-1 text-[11px] text-white/25 select-none">/</span>
          <input className="h-10 min-w-0 flex-1 pr-3 bg-transparent text-sm text-white outline-none placeholder-white/25" value={slug} onChange={(e) => { setSlugManual(true); setSlug(normalizeSlug(e.target.value)) }} placeholder={t('superadmin:barbershops.identity.slugPlaceholder')} />
        </div>
        <button onClick={() => { setSlugManual(false); setSlug(slugify(name)) }} className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors">
          {t('superadmin:barbershops.identity.generateFromName')}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !name.trim() || !slug.trim()} className={cn(darkBtn, 'bg-primary-600 text-white hover:bg-primary-700')}>
          {mut.isPending ? t('superadmin:barbershops.identity.saving') : t('superadmin:barbershops.identity.save')}
        </button>
        <button onClick={onDone} className={cn(darkBtn, 'bg-white/[0.06] text-white/50 hover:bg-white/[0.10] hover:text-white/75')}>{t('superadmin:barbershops.identity.cancel')}</button>
      </div>
    </div>
  )
}

function PlanEditor({ b, token, onDone, t, dateFnsLocale }: { b: Barbershop; token: string; onDone: () => void; t: TFunction; dateFnsLocale: Locale }) {
  const qc = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<Plan>(b.subscriptionPlan)
  const [endsAt, setEndsAt]             = useState(b.subscriptionEndsAt ? b.subscriptionEndsAt.slice(0, 10) : '')
  const PLAN_LABELS = getPlanLabels(t)
  const QUICK_DURATIONS = getQuickDurations(t)

  const mut = useMutation({
    mutationFn: () => superadminApi.updateSubscription(token, b.id, {
      plan: selectedPlan,
      endsAt: selectedPlan !== 'FREE' && endsAt ? new Date(endsAt + 'T23:59:59').toISOString() : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); onDone() },
  })

  return (
    <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
      <div className="space-y-1.5">
        <p className="text-[11px] text-white/35">{t('superadmin:barbershops.plan.plan')}</p>
        <div className="flex flex-wrap gap-2">
          {ALL_PLANS.map((p) => (
            <button key={p} onClick={() => setSelectedPlan(p)} className={cn('rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all', selectedPlan === p ? PLAN_STYLES[p].activeButton : PLAN_STYLES[p].button)}>
              {PLAN_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {selectedPlan !== 'FREE' && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-white/35">{t('superadmin:barbershops.plan.expiration')}</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_DURATIONS.map((d) => (
              <button key={d.label} onClick={() => setEndsAt(format(d.getDate(), 'yyyy-MM-dd'))} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11.5px] text-white/50 transition-all hover:bg-white/[0.09] hover:text-white/75">
                {d.label}
              </button>
            ))}
          </div>
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={cn(darkInput, 'w-auto')} />
          {endsAt && <p className="text-[11px] text-white/30">{t('superadmin:barbershops.plan.expiresOn', { date: format(new Date(endsAt), "d MMMM yyyy", { locale: dateFnsLocale }) })}</p>}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className={cn(darkBtn, 'bg-primary-600 text-white hover:bg-primary-700')}>
          {mut.isPending ? t('superadmin:barbershops.identity.saving') : t('superadmin:barbershops.identity.save')}
        </button>
        <button onClick={onDone} className={cn(darkBtn, 'bg-white/[0.06] text-white/50 hover:bg-white/[0.10] hover:text-white/75')}>{t('superadmin:barbershops.identity.cancel')}</button>
      </div>
    </div>
  )
}

function SuspendEditor({ b, token, onDone, t }: { b: Barbershop; token: string; onDone: () => void; t: TFunction }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState(b.suspendedReason ?? '')

  const mut = useMutation({
    mutationFn: (suspended: boolean) => superadminApi.suspend(token, b.id, { suspended, reason: suspended ? reason : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); onDone() },
  })

  if (b.suspended) {
    return (
      <div className="mt-3 flex items-center gap-3 border-t border-white/[0.07] pt-3">
        <p className="flex-1 text-[12px] text-red-400">{t('superadmin:barbershops.suspend.suspended', { reason: b.suspendedReason || t('superadmin:barbershops.suspend.noReason') })}</p>
        <button onClick={() => mut.mutate(false)} disabled={mut.isPending} className={cn(darkBtn, 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25')}>
          {mut.isPending ? t('superadmin:barbershops.suspend.reactivating') : t('superadmin:barbershops.suspend.reactivate')}
        </button>
        <button onClick={onDone} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">{t('superadmin:barbershops.suspend.close')}</button>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-3 border-t border-white/[0.07] pt-3">
      <p className="text-[11px] text-white/35">{t('superadmin:barbershops.suspend.reason')}</p>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('superadmin:barbershops.suspend.reasonPlaceholder')} className={darkInput} />
      <div className="flex gap-2">
        <button onClick={() => mut.mutate(true)} disabled={mut.isPending} className={cn(darkBtn, 'bg-red-500/15 text-red-300 hover:bg-red-500/25')}>
          {mut.isPending ? t('superadmin:barbershops.suspend.suspending') : t('superadmin:barbershops.suspend.suspend')}
        </button>
        <button onClick={onDone} className={cn(darkBtn, 'bg-white/[0.06] text-white/50 hover:bg-white/[0.10] hover:text-white/75')}>{t('superadmin:barbershops.identity.cancel')}</button>
      </div>
    </div>
  )
}

function PasswordEditor({ b, token, onDone, t }: { b: Barbershop; token: string; onDone: () => void; t: TFunction }) {
  const qc = useQueryClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: () => superadminApi.updateOwnerPassword(token, b.id, { password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin'] })
      onDone()
    },
    onError: (err: unknown) => {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { error?: string | { fieldErrors?: Record<string, string[]> } } } }).response?.data?.error
        : undefined
      if (typeof msg === 'string') {
        setError(msg)
        return
      }
      const fe = typeof msg === 'object' && msg?.fieldErrors ? msg.fieldErrors : undefined
      setError(fe?.password?.[0] ?? t('superadmin:barbershops.password.errorUpdate'))
    },
  })

  const handleSubmit = () => {
    if (password.length < 6) {
      setError(t('superadmin:barbershops.password.errorMin'))
      return
    }
    if (password !== confirm) {
      setError(t('superadmin:barbershops.password.errorMismatch'))
      return
    }
    setError('')
    mut.mutate()
  }

  if (!b.owner) {
    return (
      <div className="mt-4 border-t border-white/[0.07] pt-4">
        <p className="text-xs text-white/35">{t('superadmin:barbershops.password.noAdmin')}</p>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
      <p className="text-[12px] text-white/45">
        {t('superadmin:barbershops.password.newPasswordFor')} <span className="text-white/75">{b.owner.email}</span>.
      </p>
      <div className="space-y-1.5">
        <p className="text-[11px] text-white/35">{t('superadmin:barbershops.password.newPassword')}</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('superadmin:barbershops.password.minChars')}
          className={darkInput}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] text-white/35">{t('superadmin:barbershops.password.confirmPassword')}</p>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t('superadmin:barbershops.password.repeatPassword')}
          className={darkInput}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={mut.isPending} className={cn(darkBtn, 'bg-primary-600 text-white hover:bg-primary-700')}>
          {mut.isPending ? t('superadmin:barbershops.identity.saving') : t('superadmin:barbershops.password.saveNew')}
        </button>
        <button onClick={onDone} className={cn(darkBtn, 'bg-white/[0.06] text-white/50 hover:bg-white/[0.10] hover:text-white/75')}>{t('superadmin:barbershops.identity.cancel')}</button>
      </div>
    </div>
  )
}

function CreateModal({ token, onClose, t }: { token: string; onClose: () => void; t: TFunction }) {
  const qc = useQueryClient()
  const [form, setForm]         = useState({ barbershopName: '', slug: '', adminName: '', adminEmail: '', adminPassword: '', plan: 'FREE' as Plan })
  const [slugManual, setSlugManual] = useState(false)
  const [error, setError]       = useState('')
  const PLAN_LABELS = getPlanLabels(t)

  const mut = useMutation({
    mutationFn: () => superadminApi.createBarbershop(token, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); onClose() },
    onError: (err: unknown) => {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? t('superadmin:barbershops.create.errorCreate')
        : t('superadmin:barbershops.create.errorCreate')
      setError(msg === 'Slug already taken' ? t('superadmin:barbershops.create.errorSlugTaken') : msg)
    },
  })

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    if (k === 'barbershopName' && !slugManual) setForm((f) => ({ ...f, barbershopName: v, slug: slugify(v) }))
  }

  return (
    <Modal open onClose={onClose} title={t('superadmin:barbershops.create.title')} size="md">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="ui-label">{t('superadmin:barbershops.create.shopName')}</label>
          <input className="ui-control" placeholder={t('superadmin:barbershops.create.shopNamePlaceholder')} value={form.barbershopName} onChange={(e) => set('barbershopName', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="ui-label">{t('superadmin:barbershops.create.addressSlug')}</label>
          <div className="flex items-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-soft focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-100/80">
            <span className="pl-3 pr-1 text-[11px] text-ink-muted select-none">trimio.app/</span>
            <input className="h-12 min-w-0 flex-1 pr-3 bg-transparent text-sm text-ink outline-none" value={form.slug} onChange={(e) => { setSlugManual(true); setForm((f) => ({ ...f, slug: normalizeSlug(e.target.value) })) }} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="ui-label">{t('superadmin:barbershops.create.adminName')}</label>
            <input className="ui-control" placeholder={t('superadmin:barbershops.create.adminNamePlaceholder')} value={form.adminName} onChange={(e) => set('adminName', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="ui-label">{t('superadmin:barbershops.create.adminEmail')}</label>
            <input className="ui-control" type="email" placeholder={t('superadmin:barbershops.create.adminEmailPlaceholder')} value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="ui-label">{t('superadmin:barbershops.create.password')}</label>
          <input className="ui-control" type="password" placeholder={t('superadmin:barbershops.create.passwordPlaceholder')} value={form.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="ui-label">{t('superadmin:barbershops.create.initialPlan')}</label>
          <div className="grid grid-cols-3 gap-2">
            {ALL_PLANS.map((p) => (
              <button key={p} onClick={() => setForm((f) => ({ ...f, plan: p }))} className={cn(
                'rounded-xl py-2 text-xs font-semibold transition-all',
                form.plan === p
                  ? p === 'FREE'  ? 'bg-neutral-900 text-white ring-1 ring-neutral-700'
                  : p === 'BASIC' ? 'bg-blue-600 text-white ring-1 ring-blue-500'
                  :                 'bg-amber-500 text-white ring-1 ring-amber-400'
                  : 'bg-neutral-100 text-ink-soft hover:bg-neutral-200'
              )}>
                {PLAN_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-danger-200/70 bg-danger-50 px-3 py-2.5">
            <AlertTriangle size={13} className="shrink-0 text-danger-500" />
            <p className="text-[13px] text-danger-700">{error}</p>
          </div>
        )}
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !form.barbershopName || !form.slug || !form.adminName || !form.adminEmail || !form.adminPassword}
          className="mt-1 w-full rounded-xl bg-gradient-to-b from-primary-500 to-primary-600 py-2.5 text-sm font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all hover:from-primary-600 hover:to-primary-700 active:scale-[0.98] disabled:opacity-50"
        >
          {mut.isPending ? t('superadmin:barbershops.create.creating') : t('superadmin:barbershops.create.createButton')}
        </button>
      </div>
    </Modal>
  )
}

/* ── Main page ─────────────────────────────────────────────── */
export default function SuperAdminBarbershops() {
  const { t, i18n } = useTranslation(['superadmin', 'common'])
  const dateFnsLocale = getDateFnsLocale(i18n.language)
  const PLAN_LABELS = getPlanLabels(t)
  const qc = useQueryClient()
  const { token }   = useSuperAuthStore()
  const { setAuth } = useAuthStore()
  const [q, setQ]                             = useState('')
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all')
  const [healthFilter, setHealthFilter]       = useState<HealthFilter>('all')
  const [expandedId, setExpandedId]           = useState<string | null>(null)
  const [editMode, setEditMode]               = useState<'identity' | 'plan' | 'password' | 'suspend' | null>(null)
  const [showCreate, setShowCreate]           = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => superadminApi.deleteBarbershop(token!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['superadmin'] }); setConfirmDeleteId(null); setExpandedId(null) },
  })
  const supportSessionMutation = useMutation({
    mutationFn: (id: string) => superadminApi.createSupportSession(token!, id),
  })
  const resendVerificationMutation = useMutation({
    mutationFn: (id: string) => superadminApi.resendVerification(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  })
  const verifyEmailMutation = useMutation({
    mutationFn: (id: string) => superadminApi.verifyOwnerEmail(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  })

  const { data: barbershops = [], isLoading } = useQuery<Barbershop[]>({
    queryKey: ['superadmin', 'barbershops', q, verificationFilter, healthFilter],
    queryFn:  () => superadminApi.listBarbershops(token!, q || undefined, verificationFilter, healthFilter),
    enabled:  !!token,
  })

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); setEditMode(null) }
    else { setExpandedId(id); setEditMode(null) }
  }

  async function openSupportSession(id: string) {
    const w = window.open('', '_blank')
    try {
      const data = await supportSessionMutation.mutateAsync(id)
      setAuth(data.token, data.user)
      if (w) w.location.href = '/admin'
      else window.location.href = '/admin'
    } catch { if (w) w.close() }
  }

  const filterBtn = (active: boolean) => cn(
    'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
    active
      ? 'bg-primary-600/90 text-white'
      : 'bg-white/[0.05] text-white/45 hover:bg-white/[0.09] hover:text-white/70'
  )

  const actionBtn = (variant: 'default' | 'primary' | 'danger' | 'success' | 'warn' = 'default') => cn(
    'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-150 sm:justify-start',
    {
      default: 'bg-white/[0.05] text-white/50 hover:bg-white/[0.09] hover:text-white/75',
      primary: 'bg-primary-600/15 text-primary-300 hover:bg-primary-600/25',
      danger:  'bg-red-500/10 text-red-300 hover:bg-red-500/20',
      success: 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
      warn:    'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
    }[variant]
  )

  return (
    <SuperAdminLayout>
      <div className="space-y-5">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-white">{t('superadmin:barbershops.list.title')}</h1>
            <p className="mt-0.5 text-[12.5px] text-white/35">{t('superadmin:barbershops.list.registered', { count: barbershops.length })}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all hover:bg-primary-700 active:scale-[0.97]"
          >
            <Plus size={14} /> {t('superadmin:barbershops.list.newButton')}
          </button>
        </div>

        {showCreate && <CreateModal token={token!} onClose={() => setShowCreate(false)} t={t} />}

        {/* ── Search ─────────────────────────────────────── */}
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('superadmin:barbershops.list.searchPlaceholder')}
            className="h-10 w-full rounded-xl border border-white/[0.09] bg-white/[0.05] pl-10 pr-4 text-[13px] text-white placeholder-white/25 outline-none transition-all focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10"
          />
        </div>

        {/* ── Filters ────────────────────────────────────── */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">{t('superadmin:barbershops.list.verification')}</p>
            <div className="flex flex-wrap gap-1.5">
              {(['all','pending','verified'] as VerificationFilter[]).map((v) => (
                <button key={v} onClick={() => setVerificationFilter(v)} className={filterBtn(verificationFilter === v)}>
                  {t(`superadmin:barbershops.verificationFilter.${v}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">{t('superadmin:barbershops.list.accountHealth')}</p>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'active', 'suspended', 'unverified', 'no-plan'] as HealthFilter[]).map((v) => (
                <button key={v} onClick={() => setHealthFilter(v)} className={filterBtn(healthFilter === v)}>{t(`superadmin:barbershops.healthFilter.${v}`)}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── List ───────────────────────────────────────── */}
        {isLoading ? (
          <div className="py-16 text-center text-[13px] text-white/25">{t('superadmin:barbershops.list.loading')}</div>
        ) : barbershops.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
              <Scissors size={18} className="text-white/30" />
            </div>
            <p className="text-[13px] text-white/30">{t('superadmin:barbershops.list.noneFound')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {barbershops.map((b) => {
              const plan       = b.subscriptionPlan as Plan
              const s          = PLAN_STYLES[plan] ?? PLAN_STYLES.FREE
              const isExpanded = expandedId === b.id
              const expired    = plan !== 'FREE' && b.subscriptionEndsAt && isPast(new Date(b.subscriptionEndsAt))

              return (
                <div
                  key={b.id}
                  className={cn(
                    'rounded-2xl border transition-all duration-150',
                    b.suspended
                      ? 'border-red-500/20 bg-red-500/[0.04]'
                      : isExpanded
                        ? 'border-white/[0.10] bg-white/[0.05]'
                        : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.09]'
                  )}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">

                      {/* Icon + info */}
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className={cn(
                          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                          b.suspended ? 'bg-red-500/15' : 'bg-white/[0.06]'
                        )}>
                          <Scissors size={16} className={b.suspended ? 'text-red-400' : 'text-white/40'} />
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Name + badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[14px] font-semibold text-white">{b.name}</p>
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', s.badge)}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                              {PLAN_LABELS[plan]}
                            </span>
                            {b.suspended && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Suspensa
                              </span>
                            )}
                            {expired && !b.suspended && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> {t('superadmin:barbershops.badges.expired')}
                              </span>
                            )}
                            {b.health.unverifiedEmail && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {t('superadmin:barbershops.badges.emailPending')}
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-[12px] text-white/30">/{b.slug}</p>

                          {b.owner && (
                            <p className="mt-1 text-[12px] text-white/40">
                              <span className="text-white/55">{b.owner.name}</span> · {b.owner.email}
                            </p>
                          )}

                          {/* Stats row */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-white/30">
                            <span className="flex items-center gap-1.5"><Users size={10} /> {b._count.customers} {t('superadmin:barbershops.stats.customers')}</span>
                            <span className="flex items-center gap-1.5"><Calendar size={10} /> {b._count.bookings} {t('superadmin:barbershops.stats.bookings')}</span>
                            <span className="flex items-center gap-1.5"><Scissors size={10} /> {b._count.barbers} {t('superadmin:barbershops.stats.barber', { count: b._count.barbers })}</span>
                            {b.subscriptionEndsAt && plan !== 'FREE' && (
                              <span className={expired ? 'text-orange-400' : ''}>
                                {t('superadmin:barbershops.stats.expires', { date: format(new Date(b.subscriptionEndsAt), 'd MMM yyyy', { locale: dateFnsLocale }) })}
                              </span>
                            )}
                            {b.security.latestLoginAt && (
                              <span>{t('superadmin:barbershops.stats.lastLogin', { date: format(new Date(b.security.latestLoginAt), 'd MMM, HH:mm', { locale: dateFnsLocale }) })}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(b.id)}
                        className="mt-0.5 shrink-0 rounded-lg p-1.5 text-white/25 transition-all hover:bg-white/[0.07] hover:text-white/60"
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>

                    {/* ── Expanded ─────────────────────────── */}
                    {isExpanded && (
                      <>
                        {/* Actions */}
                        {editMode === null && (
                          <div className="mt-4 flex flex-col gap-1.5 border-t border-white/[0.06] pt-4 sm:flex-row sm:flex-wrap">
                            <button onClick={() => openSupportSession(b.id)} disabled={supportSessionMutation.isPending} className={actionBtn('primary')}>
                              <LogIn size={12} /> {supportSessionMutation.isPending ? t('superadmin:barbershops.actions.opening') : t('superadmin:barbershops.actions.supportSession')}
                            </button>
                            {b.health.unverifiedEmail && (
                              <>
                                <button onClick={() => resendVerificationMutation.mutate(b.id)} disabled={resendVerificationMutation.isPending} className={actionBtn()}>
                                  <RotateCw size={12} /> {resendVerificationMutation.isPending ? t('superadmin:barbershops.actions.resending') : t('superadmin:barbershops.actions.resendVerification')}
                                </button>
                                <button onClick={() => verifyEmailMutation.mutate(b.id)} disabled={verifyEmailMutation.isPending} className={actionBtn('success')}>
                                  <UserCheck size={12} /> {verifyEmailMutation.isPending ? t('superadmin:barbershops.actions.confirming') : t('superadmin:barbershops.actions.markEmailVerified')}
                                </button>
                              </>
                            )}
                            <button onClick={() => setEditMode('identity')} className={actionBtn()}>{t('superadmin:barbershops.actions.editIdentity')}</button>
                            <button onClick={() => setEditMode('plan')} className={actionBtn()}>{t('superadmin:barbershops.actions.changePlan')}</button>
                            <button onClick={() => setEditMode('password')} className={actionBtn()}>
                              <KeyRound size={12} /> {t('superadmin:barbershops.actions.changePassword')}
                            </button>
                            <button onClick={() => setEditMode('suspend')} className={actionBtn(b.suspended ? 'success' : 'danger')}>
                              {b.suspended ? <><CheckCircle size={12} /> {t('superadmin:barbershops.actions.reactivate')}</> : <><Ban size={12} /> {t('superadmin:barbershops.actions.suspend')}</>}
                            </button>

                            {/* Delete */}
                            <div className="sm:ml-auto">
                              {confirmDeleteId === b.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11.5px] text-white/35">{t('superadmin:barbershops.actions.sure')}</span>
                                  <button onClick={() => deleteMutation.mutate(b.id)} disabled={deleteMutation.isPending} className={cn(darkBtn, 'bg-red-600 text-white hover:bg-red-700')}>
                                    {deleteMutation.isPending ? t('superadmin:barbershops.actions.deleting') : t('superadmin:barbershops.actions.delete')}
                                  </button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-white/25 hover:text-white/50 transition-colors">{t('superadmin:barbershops.actions.cancel')}</button>
                                </div>
                              ) : (
                                <button onClick={() => setConfirmDeleteId(b.id)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] text-white/20 transition-all hover:bg-red-500/10 hover:text-red-400">
                                  <Trash2 size={12} /> {t('superadmin:barbershops.actions.delete')}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detail panels */}
                        <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 xl:grid-cols-[1.05fr_1fr]">
                          <div className="space-y-3">

                            {/* Admin account */}
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                              <p className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-white/70">
                                <Mail size={13} className="text-white/30" /> {t('superadmin:barbershops.detail.adminAccount')}
                              </p>
                              {b.owner ? (
                                <div className="space-y-1.5 text-[12.5px]">
                                  <p><span className="text-white/30">{t('superadmin:barbershops.detail.name')}</span> <span className="text-white/70">{b.owner.name}</span></p>
                                  <p><span className="text-white/30">{t('superadmin:barbershops.detail.email')}</span> <span className="text-white/70">{b.owner.email}</span></p>
                                  <p>
                                    <span className="text-white/30">{t('superadmin:barbershops.detail.state')}</span>{' '}
                                    {b.owner.emailVerifiedAt
                                      ? <span className="text-emerald-300">{t('superadmin:barbershops.detail.verified')}</span>
                                      : <span className="text-amber-300">{t('superadmin:barbershops.detail.pending')}</span>}
                                  </p>
                                  <p><span className="text-white/30">{t('superadmin:barbershops.detail.createdAt')}</span> <span className="text-white/55">{format(new Date(b.owner.createdAt), 'd MMM yyyy', { locale: dateFnsLocale })}</span></p>
                                </div>
                              ) : (
                                <p className="text-[12.5px] text-white/30">{t('superadmin:barbershops.detail.noOwner')}</p>
                              )}
                            </div>

                            {/* Health */}
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                              <p className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-white/70">
                                <ShieldCheck size={13} className="text-white/30" /> {t('superadmin:barbershops.detail.health')}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { ok: b.health.subscriptionActive, yes: t('superadmin:barbershops.detail.subscriptionActive'), no: t('superadmin:barbershops.detail.noSubscription') },
                                  { ok: !b.health.suspended, yes: t('superadmin:barbershops.detail.active'), no: t('superadmin:barbershops.detail.suspended') },
                                  { ok: !b.health.unverifiedEmail, yes: t('superadmin:barbershops.detail.emailVerified'), no: t('superadmin:barbershops.detail.emailPending') },
                                  { ok: !b.health.noPlan, yes: t('superadmin:barbershops.detail.planLabel', { plan: PLAN_LABELS[plan] }), no: t('superadmin:barbershops.detail.noPlan') },
                                ].map((item, i) => (
                                  <span key={i} className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', item.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/[0.05] text-white/35')}>
                                    {item.ok ? item.yes : item.no}
                                  </span>
                                ))}
                              </div>
                              {b.stripeSubscriptionStatus && (
                                <p className="mt-3 text-[11.5px] text-white/30">
                                  {t('superadmin:barbershops.detail.stripe')} <span className="text-white/55">{b.stripeSubscriptionStatus}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Security panel */}
                          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                            <p className="mb-4 flex items-center gap-2 text-[12.5px] font-semibold text-white/70">
                              <ShieldAlert size={13} className="text-white/30" /> {t('superadmin:barbershops.security.title')}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <SecurityStat icon={ShieldCheck} label={t('superadmin:barbershops.security.loginsOk')} value={b.security.successLogins} tone="good" />
                              <SecurityStat icon={ShieldAlert} label={t('superadmin:barbershops.security.failures')} value={b.security.failedLogins} tone="danger" />
                              <SecurityStat icon={KeyRound} label={t('superadmin:barbershops.security.resets')} value={b.security.passwordResetRequests} tone="warn" />
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              <SecurityStat icon={Calendar} label={t('superadmin:barbershops.security.lastLogin')} value={formatSecurityDate(b.security.latestLoginAt)} />
                              <SecurityStat icon={Calendar} label={t('superadmin:barbershops.security.lastFailure')} value={formatSecurityDate(b.security.latestFailedLoginAt)} />
                              <SecurityStat icon={Calendar} label={t('superadmin:barbershops.security.lastReset')} value={formatSecurityDate(b.security.latestPasswordResetAt)} />
                            </div>

                            <div className="mt-4">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">{t('superadmin:barbershops.security.recentActivity')}</p>
                              <div className="space-y-1.5">
                                {b.security.recentEvents.length === 0 ? (
                                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-3 text-[12.5px] text-white/30">
                                    {t('superadmin:barbershops.security.noActivity')}
                                  </div>
                                ) : b.security.recentEvents.map((ev) => (
                                  <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5">
                                    <div className="min-w-0">
                                      <p className={cn('text-[12.5px]', ev.type === 'LOGIN_SUCCESS' ? 'text-emerald-300' : ev.type === 'LOGIN_FAILURE' ? 'text-red-300' : 'text-amber-300')}>
                                        {ev.type === 'LOGIN_SUCCESS' ? t('superadmin:barbershops.security.eventLoginSuccess') : ev.type === 'LOGIN_FAILURE' ? t('superadmin:barbershops.security.eventLoginFailure') : t('superadmin:barbershops.security.eventPasswordReset')}
                                      </p>
                                      <p className="truncate text-[11px] text-white/30">
                                        {ev.email || b.owner?.email || '—'}{ev.reason ? ` · ${ev.reason}` : ''}
                                      </p>
                                    </div>
                                    <p className="shrink-0 text-[11px] text-white/25">
                                      {format(new Date(ev.createdAt), 'd MMM, HH:mm', { locale: dateFnsLocale })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Inline editors */}
                        {editMode === 'identity' && <IdentityEditor b={b} token={token!} onDone={() => setEditMode(null)} t={t} />}
                        {editMode === 'plan'     && <PlanEditor     b={b} token={token!} onDone={() => setEditMode(null)} t={t} dateFnsLocale={dateFnsLocale} />}
                        {editMode === 'suspend'  && <SuspendEditor  b={b} token={token!} onDone={() => setEditMode(null)} t={t} />}
                        {editMode === 'password' && <PasswordEditor b={b} token={token!} onDone={() => setEditMode(null)} t={t} />}
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
