import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Shield, TrendingUp } from 'lucide-react'
import { superadminApi } from '@/lib/api'
import { useSuperAuthStore } from '@/store/superauth'
import { applyPlatformAccent } from '@/lib/theme'

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

  useEffect(() => {
    applyPlatformAccent()
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_24rem),radial-gradient(circle_at_top_left,rgba(59,130,246,0.09),transparent_28rem),linear-gradient(180deg,#090b10_0%,#11151d_100%)] p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center">
        <section className="hidden rounded-[2rem] border border-white/10 bg-white/[0.04] px-10 py-12 text-white backdrop-blur-xl lg:block">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500">
            <Shield size={26} className="text-white" />
          </div>
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Platform control</p>
          <h1 className="mt-4 max-w-lg text-5xl font-semibold leading-[0.96]">Visão global sobre adoção, operação e crescimento.</h1>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Building2, title: 'Rede de barbearias' },
              { icon: TrendingUp, title: 'Crescimento e planos' },
              { icon: Shield, title: 'Controlo da plataforma' },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                  <item.icon size={16} className="text-accent-300" />
                </div>
                <p className="mt-4 text-sm font-semibold">{item.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-8">
          <div className="mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500">
              <Shield size={26} className="text-white" />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Super admin</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Entrar no controlo da plataforma</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Acesso reservado à camada de supervisão do Trimio.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@trimio.app"
              required
              className="w-full h-12 rounded-[18px] border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-accent-500/15 focus:border-accent-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 rounded-[18px] border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-accent-500/15 focus:border-accent-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-white text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 disabled:opacity-60"
          >
            {loading ? 'A entrar…' : <>Entrar <ArrowRight size={16} /></>}
          </button>
          </form>
        </section>
      </div>
    </div>
  )
}
