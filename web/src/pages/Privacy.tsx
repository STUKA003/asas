import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useTenant } from '@/providers/TenantProvider'

export default function Privacy() {
  const { barbershop } = useTenant()

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft sm:p-8">
            <p className="eyebrow">Privacidade</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink">
              Política de Privacidade
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              Esta página explica como os dados pessoais são usados para gerir reservas na {barbershop?.name ?? 'barbearia'}.
            </p>

            <div className="mt-8 space-y-8 text-sm leading-7 text-ink">
              <section>
                <h2 className="text-lg font-semibold">1. Quem trata os dados</h2>
                <p className="mt-2 text-ink-muted">
                  O responsável pelo tratamento é a {barbershop?.name ?? 'barbearia'} relativamente aos dados necessários para gerir reservas, contacto operacional e histórico de atendimento.
                  A plataforma Trimio atua como prestadora tecnológica do sistema.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold">2. Que dados são recolhidos</h2>
                <p className="mt-2 text-ink-muted">
                  Podem ser recolhidos nome, telefone, email, pessoa atendida, observações da reserva, data e hora da marcação, serviços selecionados e dados técnicos de consentimento associados ao momento da marcação.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold">3. Finalidades</h2>
                <p className="mt-2 text-ink-muted">
                  Os dados são usados para criar e gerir reservas, enviar confirmação e link seguro de gestão, remarcar ou cancelar marcações, manter histórico operacional e cumprir obrigações legais aplicáveis.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold">4. Base legal</h2>
                <p className="mt-2 text-ink-muted">
                  O tratamento assenta na execução da reserva solicitada pelo titular, no interesse legítimo de organização operacional da agenda e, quando aplicável, no cumprimento de obrigações legais.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold">5. Conservação</h2>
                <p className="mt-2 text-ink-muted">
                  Os dados da reserva são conservados enquanto forem necessários para operação, histórico de serviço, faturação, defesa de direitos e cumprimento legal.
                  Quando o titular exercer o direito ao apagamento através do link seguro da reserva, os dados pessoais identificativos podem ser anonimizados, mantendo-se apenas registos operacionais não identificáveis.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold">6. Direitos do titular</h2>
                <p className="mt-2 text-ink-muted">
                  O titular pode pedir acesso, exportação, retificação, limitação, oposição e anonimização/apagamento dos seus dados quando aplicável.
                  No link seguro de gestão da reserva existem ações próprias para exportar e anonimizar os dados ligados à reserva.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold">7. Contacto</h2>
                <p className="mt-2 text-ink-muted">
                  Para questões de privacidade, usa os contactos públicos da {barbershop?.name ?? 'barbearia'} apresentados neste site.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
