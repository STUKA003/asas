import { Link } from 'react-router-dom'
import { ExternalLink, Mail, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useTenant } from '@/providers/TenantProvider'

const POLICY_VERSION = '2026-04'
const TRIMIO_EMAIL = 'privacidade@trimio.pt'
const CNPD_URL = 'https://www.cnpd.pt'

type PrivacyCard = { title: string; desc: string }

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

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
      <table className="min-w-full text-xs">
        <thead className="bg-neutral-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-ink">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row, i) => (
            <tr key={i} className="bg-white">
              {row.map((cell, index) => (
                <td key={cell} className={`px-3 py-2.5 ${index === 0 ? 'font-medium text-ink' : ''}`}>{cell}</td>
              ))}
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
  const shopName = barbershop?.name ?? t('privacy.shopFallback')
  const shopContact = barbershop?.phone || barbershop?.whatsapp || barbershop?.instagram
  const policyDate = t('privacy.policyDate')
  const dataHeaders = t('privacy.data.headers', { returnObjects: true }) as string[]
  const dataRows = t('privacy.data.rows', { returnObjects: true }) as string[][]
  const retentionItems = t('privacy.retention.items', { returnObjects: true }) as string[]
  const processorHeaders = t('privacy.processors.headers', { returnObjects: true }) as string[]
  const processorRows = t('privacy.processors.rows', { returnObjects: true }) as string[][]
  const rights = t('privacy.rights.items', { returnObjects: true }) as PrivacyCard[]
  const cookieItems = t('privacy.cookies.items', { returnObjects: true }) as string[]

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
                  {t('privacy.versionDate', { version: POLICY_VERSION, date: policyDate })}
                </p>
              </div>
            </div>

            <p className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50 px-5 py-4 text-sm leading-7 text-ink-muted">
              {t('privacy.intro', { shopName })}
            </p>

            <div className="mt-8 space-y-8">

              <Section n={1} title={t('privacy.controller.title')}>
                <p>{t('privacy.controller.p1', { shopName })}</p>
                <p>{t('privacy.controller.p2', { shopName })}</p>
                {shopContact ? (
                  <p>{t('privacy.controller.shopContact', { shopName })}</p>
                ) : null}
                <p>
                  {t('privacy.controller.platformContact')}{' '}
                  <a href={`mailto:${TRIMIO_EMAIL}`} className="font-medium text-primary-700 underline underline-offset-4">{TRIMIO_EMAIL}</a>.
                </p>
              </Section>

              <Section n={2} title={t('privacy.data.title')}>
                <p>{t('privacy.data.intro')}</p>
                <Table headers={dataHeaders} rows={dataRows} />
                <p className="mt-3">
                  {t('privacy.data.noMarketing')}
                </p>
              </Section>

              <Section n={3} title={t('privacy.retention.title')}>
                <p>{t('privacy.retention.intro')}</p>
                <ul className="mt-2 space-y-1.5 pl-4">
                  {retentionItems.map((item) => <li key={item} className="list-disc">{item}</li>)}
                </ul>
                <p>{t('privacy.retention.footer')}</p>
              </Section>

              <Section n={4} title={t('privacy.processors.title')}>
                <p>{t('privacy.processors.intro', { shopName })}</p>
                <Table headers={processorHeaders} rows={processorRows} />
                <p className="mt-3">
                  {t('privacy.processors.noSale')}
                </p>
              </Section>

              <Section n={5} title={t('privacy.transfers.title')}>
                <p>{t('privacy.transfers.body')}</p>
              </Section>

              <Section n={6} title={t('privacy.rights.title')}>
                <p>{t('privacy.rights.intro')}</p>
                <div className="mt-3 space-y-2">
                  {rights.map(({ title, desc }) => (
                    <div key={title} className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                      <p className="text-xs font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{desc}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3">
                  {t('privacy.rights.contact', { shopName })}{' '}
                  <a href={`mailto:${TRIMIO_EMAIL}`} className="font-medium text-primary-700 underline underline-offset-4">{TRIMIO_EMAIL}</a>.
                  {' '}{t('privacy.rights.responseTime')}
                </p>
              </Section>

              <Section n={7} title={t('privacy.cookies.title')}>
                <p>{t('privacy.cookies.intro')}</p>
                <ul className="mt-2 space-y-1.5 pl-4">
                  {cookieItems.map((item) => <li key={item} className="list-disc">{item}</li>)}
                </ul>
                <p>{t('privacy.cookies.footer')}</p>
              </Section>

              <Section n={8} title={t('privacy.security.title')}>
                <p>{t('privacy.security.body')}</p>
              </Section>

              <Section n={9} title={t('privacy.authority.title')}>
                <p>{t('privacy.authority.body')}</p>
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
                    <p className="font-semibold text-ink">{t('privacy.authority.name')}</p>
                    <p className="text-xs text-ink-muted">{t('privacy.authority.address')}</p>
                  </div>
                  <ExternalLink size={14} className="ml-auto shrink-0 text-ink-muted" />
                </a>
              </Section>

              <Section n={10} title={t('privacy.changes.title')}>
                <p>{t('privacy.changes.body')}</p>
              </Section>

              <Section n={11} title={t('privacy.contact.title')}>
                <p>{t('privacy.contact.shop', { shopName })}</p>
                <p>{t('privacy.contact.platform')}</p>
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
              <p>{t('privacy.versionDate', { version: POLICY_VERSION, date: policyDate })}</p>
              <Link to={`/${slug}/booking`} className="font-medium text-primary-700 underline underline-offset-4">
                {t('header.bookNow')}
              </Link>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
