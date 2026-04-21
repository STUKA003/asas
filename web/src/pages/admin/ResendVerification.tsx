import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Mail, RotateCw } from 'lucide-react'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { applyPlatformAccent } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'
import { getInboxLink } from '@/lib/emailLinks'
import adminLogo from '@/assets/branding/barbershop-logo.png'

const schema = z.object({
  slug:  z.string().min(1, 'Slug obrigatório'),
  email: z.string().email('E-mail inválido'),
})
type FormData = z.infer<typeof schema>

export default function ResendVerification() {
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [message, setMessage]               = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.resendVerificationEmail(data),
    onSuccess: (data, variables) => {
      setMessage(data.message)
      setSubmittedEmail(variables.email)
    },
  })

  useEffect(() => { applyPlatformAccent() }, [])
  useInstallBrand('admin')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafc] px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src={adminLogo} alt="Trimio Studio" className="h-12 w-12 rounded-2xl object-contain" />
        </div>

        {message ? (
          /* ── Success state ─────────────────────────── */
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-100">
              <Mail size={24} className="text-success-600" />
            </div>
            <h1 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-ink">Email enviado</h1>
            <p className="mt-2 text-[13.5px] leading-6 text-ink-muted">{message}</p>

            <div className="mt-6 flex flex-col gap-2.5">
              {submittedEmail && (
                <a href={getInboxLink(submittedEmail)} target="_blank" rel="noreferrer">
                  <Button size="lg" className="w-full">
                    Abrir caixa de email <ArrowRight size={15} />
                  </Button>
                </a>
              )}
              <Link to="/admin/login">
                <Button variant="secondary" className="w-full">Voltar ao login</Button>
              </Link>
            </div>
          </div>
        ) : (
          /* ── Form ──────────────────────────────────── */
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
                <RotateCw size={20} className="text-primary-600" />
              </div>
              <h1 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-ink">
                Reenviar confirmação
              </h1>
              <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">
                Se a conta existir e ainda não estiver confirmada, enviamos um novo email.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-medium">
              <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                <Input
                  label="Slug da barbearia"
                  placeholder="minha-barbearia"
                  autoComplete="organization"
                  error={errors.slug?.message}
                  {...register('slug')}
                />
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="admin@email.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
                  Reenviar email <ArrowRight size={15} />
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-[12.5px] text-ink-muted">
              <Link to="/admin/login" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
                ← Voltar ao login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
