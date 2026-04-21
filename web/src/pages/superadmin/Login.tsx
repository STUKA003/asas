import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Shield, TrendingUp, BarChart2 } from 'lucide-react'
import { superadminApi } from '@/lib/api'
import { useSuperAuthStore } from '@/store/superauth'
import { applyPlatformAccent } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'
import superadminLogo from '@/assets/branding/superadmin-logo.png'

const STATS = [
  { icon: Building2,  label: 'Rede de barbearias',    desc: 'Visão centralizada de todas as contas activas.' },
  { icon: TrendingUp, label: 'Crescimento e planos',   desc: 'MRR, upgrades e ciclo de faturação por conta.' },
  { icon: BarChart2,  label: 'Controlo da plataforma', desc: 'Suspensões, estados e saúde operacional global.' },
]

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const { login } = useSuperAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await superadminApi.login({ email, password })
      login(token)
      navigate('/superadmin')
    } catch {
      setError('Credenciais inválidas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { applyPlatformAccent() }, [])
  useInstallBrand('superadmin')

  return (
    <div className="flex min-h-screen" style={{ background: '#0a0a0e' }}>

      {/* ── Left — brand panel ───────────────────────────────── */}
      <div
        className="relative hidden w-[52%] shrink-0 flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16"
        style={{ background: '#0d0d12' }}
      >
        {/* Subtle glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 65% 50% at 15% -5%,  rgba(99,102,241,0.14) 0%, transparent 55%),' +
              'radial-gradient(ellipse 40% 35% at 90% 105%, rgba(79,70,229,0.08) 0%, transparent 50%)',
          }}
        />

        {/* Top — logo + wordmark */}
        <div className="relative flex items-center gap-3">
          <img src={superadminLogo} alt="Trimio Command" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-white">Trimio Command</p>
            <p className="text-[11px] text-white/30">Controlo da plataforma</p>
          </div>
        </div>

        {/* Middle — headline + stats */}
        <div className="relative">
          <p className="mb-5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/25">
            Platform control
          </p>
          <h1 className="max-w-xs text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.04em] text-white">
            Visão global sobre toda a operação.
          </h1>
          <p className="mt-5 max-w-sm text-[14px] leading-7 text-white/40">
            Gestão centralizada de barbearias, planos, faturação e saúde da plataforma — num único ponto de comando.
          </p>

          <div className="mt-10 space-y-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex items-start gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-600/20">
                  <s.icon size={15} className="text-primary-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{s.label}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-white/35">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="relative text-[11px] text-white/15">
          © {new Date().getFullYear()} Trimio · Acesso restrito
        </p>
      </div>

      {/* ── Right — form panel ───────────────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10"
        style={{ background: '#0a0a0e' }}
      >
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <img src={superadminLogo} alt="Trimio Command" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-[14px] font-semibold tracking-tight text-white">Trimio Command</span>
        </div>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600/20">
              <Shield size={20} className="text-primary-400" />
            </div>
            <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-white">
              Acesso ao Command
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-6 text-white/40">
              Área restrita — supervisão da plataforma Trimio.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/35">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@trimio.app"
                autoComplete="email"
                required
                className="h-12 w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 text-sm text-white placeholder-white/20 outline-none transition-all duration-150 hover:border-white/[0.16] focus:border-primary-500/60 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/35">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="h-12 w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 text-sm text-white placeholder-white/20 outline-none transition-all duration-150 hover:border-white/[0.16] focus:border-primary-500/60 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3.5 py-2.5 text-[13px] text-danger-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[13.5px] font-semibold text-[#0a0a0e] transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] active:translate-y-px disabled:opacity-50"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)' }}
            >
              {loading ? 'A entrar…' : <> Entrar no Command <ArrowRight size={15} /> </>}
            </button>
          </form>

          <p className="mt-8 text-center text-[12px] text-white/20">
            Acesso reservado a administradores da plataforma Trimio.
          </p>
        </div>
      </div>
    </div>
  )
}
