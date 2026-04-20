import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Building2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { AppMark } from '@/components/ui/AppMark'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { applyPlatformAccent } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'

const schema = z.object({
  slug: z.string().min(1, 'Slug obrigatório'),
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPassword() {
  const [message, setMessage] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.forgotPassword(data),
    onSuccess: (data) => setMessage(data.message),
  })

  useEffect(() => {
    applyPlatformAccent()
  }, [])

  useInstallBrand('admin')

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfcfb_0%,#f3f4f7_100%)] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center">
        <section className="surface-panel w-full rounded-[2rem] border border-white/70 p-8">
          <AppMark
            icon={Building2}
            eyebrow="Recuperação"
            title="Trimio Studio"
            subtitle="Recuperar acesso admin."
            tone="admin"
            compact
          />
          <h1 className="mt-8 text-3xl font-semibold text-zinc-950">Redefinir password</h1>
          <p className="mt-2 text-sm text-zinc-500">Introduz o slug da barbearia e o teu email. Se a conta existir, enviamos um link de recuperação.</p>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="mt-6 space-y-4">
            <Input label="Slug da barbearia" placeholder="minha-barbearia" error={errors.slug?.message} {...register('slug')} />
            <Input label="E-mail" type="email" placeholder="admin@email.com" error={errors.email?.message} {...register('email')} />
            {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
            <Button type="submit" className="w-full" loading={mutation.isPending}>
              Enviar email <ArrowRight size={16} />
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link to="/admin/login" className="font-medium text-accent-600 hover:underline">Voltar ao login</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
