import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Building2, MailCheck } from 'lucide-react'
import { authApi } from '@/lib/api'
import { AppMark } from '@/components/ui/AppMark'
import { Button } from '@/components/ui/Button'
import { useInstallBrand } from '@/lib/installBrand'
import { applyPlatformAccent } from '@/lib/theme'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const mutation = useMutation({
    mutationFn: () => authApi.verifyEmail(token),
  })

  useEffect(() => {
    applyPlatformAccent()
    if (token) {
      mutation.mutate()
    }
  }, [token])

  useInstallBrand('admin')

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfcfb_0%,#f3f4f7_100%)] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center">
        <section className="surface-panel w-full rounded-[2rem] border border-white/70 p-8">
          <AppMark
            icon={Building2}
            eyebrow="Confirmação"
            title="Trimio Studio"
            subtitle="Ativação da conta admin."
            tone="admin"
            compact
          />
          <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <MailCheck size={24} />
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-zinc-950">Confirmar email</h1>
          {!token ? (
            <p className="mt-3 text-sm text-red-600">O link de confirmação está incompleto.</p>
          ) : mutation.isPending ? (
            <p className="mt-3 text-sm text-zinc-600">Estamos a confirmar o teu email…</p>
          ) : mutation.isSuccess ? (
            <p className="mt-3 text-sm text-zinc-600">Email confirmado. Já podes entrar no painel.</p>
          ) : (
            <p className="mt-3 text-sm text-red-600">
              {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Não foi possível confirmar este email.'}
            </p>
          )}
          <div className="mt-6">
            <Link to="/admin/login" className="block">
              <Button type="button" className="w-full">
                Ir para login
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
