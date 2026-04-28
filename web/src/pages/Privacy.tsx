import { Link } from 'react-router-dom'
import { ExternalLink, Mail, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useTenant } from '@/providers/TenantProvider'

const POLICY_VERSION = '2026-04'
const POLICY_DATE = '27 de abril de 2026'
const TRIMIO_EMAIL = 'privacidade@trimio.pt'
const CNPD_URL = 'https://www.cnpd.pt'

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink">
        {n}. {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-7 text-ink-muted">{children}</div>
    </section>
  )
}

function Table({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
      <table className="min-w-full text-xs">
        <thead className="bg-neutral-50">
          <tr>
            {['Dado', 'Finalidade', 'Base legal', 'Conservação'].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-ink">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map(([dado, fin, base, cons], i) => (
            <tr key={i} className="bg-white">
              <td className="px-3 py-2.5 font-medium text-ink">{dado}</td>
              <td className="px-3 py-2.5">{fin}</td>
              <td className="px-3 py-2.5">{base}</td>
              <td className="px-3 py-2.5">{cons}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Privacy() {
  const { slug, barbershop } = useTenant()
  const { t } = useTranslation('public')
  const shopName = barbershop?.name ?? 'a barbearia'
  const shopContact = barbershop?.phone || barbershop?.whatsapp || barbershop?.instagram

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft sm:p-10">

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50">
                <Shield size={22} className="text-primary-700" />
              </div>
              <div>
                <p className="eyebrow">{t('privacy.eyebrow')}</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-ink">
                  {t('privacy.title')}
                </h1>
                <p className="mt-1 text-xs text-ink-muted">
                  {t('privacy.versionDate', { version: POLICY_VERSION, date: POLICY_DATE })}
                </p>
              </div>
            </div>

            <p className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50 px-5 py-4 text-sm leading-7 text-ink-muted">
              Esta política explica como os teus dados pessoais são tratados quando utilizas o sistema de agendamento de <strong className="text-ink">{shopName}</strong>, suportado pela plataforma <strong className="text-ink">Trimio</strong>.
              Lê-a antes de fazeres uma marcação.
            </p>

            <div className="mt-8 space-y-8">

              <Section n={1} title="Responsável pelo tratamento e subcontratante">
                <p>
                  O <strong className="text-ink">responsável pelo tratamento</strong> dos teus dados pessoais é <strong className="text-ink">{shopName}</strong>,
                  enquanto entidade que define as finalidades e meios de tratamento dos dados recolhidos no âmbito das reservas.
                </p>
                <p>
                  A <strong className="text-ink">Trimio</strong> actua como <strong className="text-ink">subcontratante</strong> (processador de dados) — fornece a plataforma tecnológica e trata dados apenas sob instrução de {shopName},
                  sem acesso editorial ao conteúdo das reservas para fins próprios.
                </p>
                {shopContact ? (
                  <p>Para questões relativas à tua reserva ou dados pessoais, contacta {shopName} através dos meios disponíveis neste site.</p>
                ) : null}
                <p>
                  Para questões relativas à plataforma Trimio, escreve para{' '}
                  <a href={`mailto:${TRIMIO_EMAIL}`} className="font-medium text-primary-700 underline underline-offset-4">{TRIMIO_EMAIL}</a>.
                </p>
              </Section>

              <Section n={2} title="Dados tratados, finalidades e bases legais">
                <p>Tratamos apenas os dados estritamente necessários para prestar o serviço de agendamento.</p>
                <Table rows={[
                  ['Nome', 'Identificar o cliente e a pessoa atendida', 'Execução de contrato — Art. 6.º(1)(b) RGPD', '3 anos após última reserva'],
                  ['Telefone', 'Contacto operacional (confirmações, cancelamentos, remarcações)', 'Execução de contrato — Art. 6.º(1)(b) RGPD', '3 anos após última reserva'],
                  ['Email (opcional)', 'Envio do link seguro de gestão da reserva e confirmações', 'Execução de contrato — Art. 6.º(1)(b) RGPD', '3 anos após última reserva'],
                  ['Observações (opcional)', 'Informações específicas do serviço comunicadas pelo cliente', 'Execução de contrato — Art. 6.º(1)(b) RGPD', '3 anos após última reserva'],
                  ['Data/hora, serviço, barbeiro', 'Organização da agenda e prestação do serviço', 'Execução de contrato — Art. 6.º(1)(b) RGPD', '3 anos após última reserva'],
                  ['Endereço IP no momento do consentimento', 'Registo de auditoria do consentimento dado', 'Obrigação legal / interesse legítimo — Art. 6.º(1)(c)(f)', '3 anos após a reserva'],
                  ['Data e versão do consentimento', 'Prova de que o consentimento foi obtido de forma válida', 'Obrigação legal — Art. 6.º(1)(c) RGPD', '5 anos (prazo de prescrição geral)'],
                ]} />
                <p className="mt-3">
                  Não utilizamos os teus dados para marketing, criação de perfis, tomadas de decisão automatizadas com efeitos jurídicos, ou qualquer finalidade incompatível com a gestão da reserva.
                </p>
              </Section>

              <Section n={3} title="Período de conservação e anonimização automática">
                <p>
                  Os dados pessoais identificativos são conservados pelo período necessário à gestão da relação de serviço, defesa de direitos e cumprimento de obrigações legais, com o seguinte calendário:
                </p>
                <ul className="mt-2 space-y-1.5 pl-4">
                  <li className="list-disc"><strong className="text-ink">Dados operacionais activos</strong> — enquanto houver reservas pendentes ou confirmadas.</li>
                  <li className="list-disc"><strong className="text-ink">Dados históricos</strong> — até 3 anos após a última reserva realizada.</li>
                  <li className="list-disc"><strong className="text-ink">Registo de consentimento (IP, data, versão)</strong> — até 5 anos para fins de auditoria e conformidade.</li>
                  <li className="list-disc"><strong className="text-ink">Após o prazo ou pedido de anonimização</strong> — os dados identificativos são substituídos por um identificador anónimo; os registos operacionais (data, serviço, duração) são mantidos para fins estatísticos e de faturação.</li>
                </ul>
                <p>
                  O sistema aplica anonimização automática dos dados de clientes sem actividade há mais de 3 anos.
                  Podes exercer o direito de apagamento a qualquer momento através do link seguro da tua reserva.
                </p>
              </Section>

              <Section n={4} title="Subcontratantes e destinatários">
                <p>
                  Para prestar o serviço, {shopName} e a Trimio recorrem aos seguintes subcontratantes técnicos,
                  que tratam dados pessoais sob instruções documentadas e com garantias adequadas de conformidade com o RGPD:
                </p>
                <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-neutral-50">
                      <tr>
                        {['Subcontratante', 'Função', 'Localização', 'Garantias'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-ink">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      <tr>
                        <td className="px-3 py-2.5 font-medium text-ink">OVH SAS</td>
                        <td className="px-3 py-2.5">Alojamento e infra-estrutura</td>
                        <td className="px-3 py-2.5">França (UE)</td>
                        <td className="px-3 py-2.5">RGPD / cláusulas-tipo</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-medium text-ink">Cloudflare, Inc.</td>
                        <td className="px-3 py-2.5">CDN, firewall, segurança</td>
                        <td className="px-3 py-2.5">EUA / edge global</td>
                        <td className="px-3 py-2.5">DPF UE-EUA / cláusulas-tipo</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-medium text-ink">Stripe, Inc.</td>
                        <td className="px-3 py-2.5">Processamento de pagamentos (planos)</td>
                        <td className="px-3 py-2.5">EUA / edge global</td>
                        <td className="px-3 py-2.5">DPF UE-EUA / cláusulas-tipo</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-medium text-ink">Resend, Inc.</td>
                        <td className="px-3 py-2.5">Envio de emails transaccionais</td>
                        <td className="px-3 py-2.5">EUA</td>
                        <td className="px-3 py-2.5">DPF UE-EUA / cláusulas-tipo</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3">
                  Não vendemos nem partilhamos dados pessoais com terceiros para fins de marketing, publicidade ou criação de perfis.
                </p>
              </Section>

              <Section n={5} title="Transferências internacionais">
                <p>
                  Alguns dos subcontratantes listados operam fora da União Europeia (nomeadamente nos EUA).
                  Essas transferências são efectuadas ao abrigo de mecanismos legais adequados,
                  designadamente o <strong className="text-ink">Data Privacy Framework UE-EUA</strong> (onde aplicável)
                  e/ou <strong className="text-ink">cláusulas contratuais-tipo</strong> aprovadas pela Comissão Europeia,
                  garantindo um nível de protecção equivalente ao exigido pelo RGPD.
                </p>
              </Section>

              <Section n={6} title="Os teus direitos">
                <p>Enquanto titular dos dados, tens os seguintes direitos, que podes exercer a qualquer momento:</p>
                <div className="mt-3 space-y-2">
                  {[
                    ['Acesso', 'Saber que dados temos sobre ti e obter uma cópia. Usa o botão "Exportar os meus dados" no link da tua reserva.'],
                    ['Portabilidade', 'Receber os teus dados em formato estruturado e legível por máquina (JSON). Disponível no link da reserva.'],
                    ['Retificação', 'Corrigir dados incorrectos. Contacta a barbearia ou remarca para actualizar os dados.'],
                    ['Apagamento / Anonimização', 'Pedir a eliminação dos dados identificativos. Usa o botão "Anonimizar os meus dados" na tua reserva. Os registos operacionais anónimos são mantidos.'],
                    ['Limitação do tratamento', 'Solicitar que os dados sejam conservados mas não tratados activamente. Contacta a barbearia.'],
                    ['Oposição', 'Opor-te ao tratamento com base em interesse legítimo. Contacta a barbearia.'],
                    ['Não sujeição a decisões automatizadas', 'Não tomamos decisões sobre ti exclusivamente por meios automatizados com efeitos jurídicos significativos.'],
                    ['Retirar o consentimento', 'Se o tratamento se basear em consentimento, podes retirá-lo a qualquer momento sem prejuízo da licitude do tratamento anterior. Usa a opção de anonimização na tua reserva.'],
                  ].map(([title, desc]) => (
                    <div key={title} className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                      <p className="text-xs font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{desc}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3">
                  Para exercer direitos que não possam ser satisfeitos pelo link da reserva, contacta {shopName} através dos meios públicos disponíveis neste site
                  ou a Trimio em <a href={`mailto:${TRIMIO_EMAIL}`} className="font-medium text-primary-700 underline underline-offset-4">{TRIMIO_EMAIL}</a>.
                  Respondemos no prazo de 30 dias (prorrogável por mais 60 dias em casos complexos).
                </p>
              </Section>

              <Section n={7} title="Cookies e armazenamento local">
                <p>
                  Este site <strong className="text-ink">não utiliza cookies de rastreamento, publicidade ou análise de terceiros</strong>.
                  São utilizados apenas:
                </p>
                <ul className="mt-2 space-y-1.5 pl-4">
                  <li className="list-disc"><strong className="text-ink">Armazenamento local (localStorage)</strong> — para guardar o token de sessão de administrador/barbeiro enquanto estás autenticado. É eliminado ao terminar sessão.</li>
                  <li className="list-disc"><strong className="text-ink">Cloudflare</strong> — pode definir cookies técnicos de segurança e desempenho (ex.: <code>__cf_bm</code>) necessários ao funcionamento da infra-estrutura. Estes são essenciais e não rastreiam comportamento pessoal para fins publicitários.</li>
                </ul>
                <p>
                  Por não utilizarmos cookies de análise ou marketing, não é apresentado um banner de consentimento de cookies — não há nada a aceitar ou recusar nesse âmbito.
                </p>
              </Section>

              <Section n={8} title="Segurança">
                <p>
                  Adoptamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais, incluindo:
                  transmissão encriptada via TLS 1.3, armazenamento em base de dados com acesso restrito,
                  firewall com lista de permissões limitada, tokens de acesso com expiração e autenticação por chave criptográfica.
                  O acesso aos dados de clientes por parte dos administradores da barbearia é efectuado em ambiente autenticado e registado.
                </p>
              </Section>

              <Section n={9} title="Autoridade de controlo">
                <p>
                  Tens o direito de apresentar uma reclamação junto da autoridade de controlo competente.
                  Em Portugal, a autoridade competente é a:
                </p>
                <a
                  href={CNPD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm transition-colors hover:bg-neutral-100"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Shield size={16} className="text-primary-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">CNPD — Comissão Nacional de Protecção de Dados</p>
                    <p className="text-xs text-ink-muted">Rua de São Bento 148-3.º, 1200-821 Lisboa · geral@cnpd.pt · cnpd.pt</p>
                  </div>
                  <ExternalLink size={14} className="ml-auto shrink-0 text-ink-muted" />
                </a>
              </Section>

              <Section n={10} title="Alterações a esta política">
                <p>
                  Esta política pode ser actualizada para reflectir alterações legais, técnicas ou de serviço.
                  A versão e data no topo desta página identificam sempre a versão em vigor.
                  O campo <code>privacyConsentVersion</code> gravado na tua reserva identifica a versão da política que aceitaste no momento do agendamento.
                  Alterações substanciais serão comunicadas através de aviso visível neste site.
                </p>
              </Section>

              <Section n={11} title="Contacto para questões de privacidade">
                <p>
                  Para questões relacionadas com os teus dados no âmbito de uma reserva específica, utiliza os contactos públicos de <strong className="text-ink">{shopName}</strong> disponíveis neste site.
                </p>
                <p>
                  Para questões relativas à plataforma Trimio enquanto subcontratante:
                </p>
                <a
                  href={`mailto:${TRIMIO_EMAIL}`}
                  className="mt-2 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm transition-colors hover:bg-neutral-100"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Mail size={16} className="text-primary-700" />
                  </div>
                  <span className="font-medium text-ink">{TRIMIO_EMAIL}</span>
                </a>
              </Section>

            </div>

            <div className="mt-10 flex items-center justify-between border-t border-neutral-100 pt-6 text-xs text-ink-muted">
              <p>Versão {POLICY_VERSION} · {POLICY_DATE}</p>
              <Link to={`/${slug}/booking`} className="font-medium text-primary-700 underline underline-offset-4">
                Fazer marcação
              </Link>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
