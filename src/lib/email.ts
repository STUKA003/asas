type EmailPayload = {
  html: string
  subject: string
  text: string
  to: string
}

type EmailSection = {
  items: string[]
  title: string
}

type EmailTemplateInput = {
  ctaLabel?: string
  ctaUrl?: string
  footer?: string
  intro: string[]
  outro?: string[]
  preheader: string
  sections?: EmailSection[]
  title: string
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function canSendEmail() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim())
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderEmailTemplate(input: EmailTemplateInput) {
  const introHtml = input.intro.map((line) => `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(line)}</p>`).join('')
  const sectionsHtml = (input.sections ?? [])
    .map((section) => `
      <div style="margin:20px 0 0;border:1px solid #e2e8f0;border-radius:18px;padding:18px 18px 6px;background:#f8fafc;">
        <p style="margin:0 0 12px;color:#0f172a;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(section.title)}</p>
        ${section.items.map((item) => `<p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(item)}</p>`).join('')}
      </div>
    `)
    .join('')
  const outroHtml = (input.outro ?? []).map((line) => `<p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.7;">${escapeHtml(line)}</p>`).join('')
  const ctaHtml = input.ctaLabel && input.ctaUrl
    ? `
      <div style="margin:28px 0 24px;">
        <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
          ${escapeHtml(input.ctaLabel)}
        </a>
      </div>
      <p style="margin:0 0 14px;color:#64748b;font-size:12px;line-height:1.6;">Se o botão não funcionar, usa este link: ${escapeHtml(input.ctaUrl)}</p>
    `
    : ''

  const html = `
    <!doctype html>
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(input.title)}</title>
      </head>
      <body style="margin:0;padding:32px 16px;background:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(input.preheader)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;border-collapse:separate;">
          <tr>
            <td style="padding:0;">
              <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%);border-radius:28px 28px 0 0;padding:28px 28px 24px;">
                <p style="margin:0 0 12px;color:#cbd5e1;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Trimio</p>
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2;font-weight:800;">${escapeHtml(input.title)}</h1>
              </div>
              <div style="background:#ffffff;border-radius:0 0 28px 28px;padding:28px;box-shadow:0 24px 80px rgba(15,23,42,0.12);">
                ${introHtml}
                ${sectionsHtml}
                ${ctaHtml}
                ${outroHtml}
                <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">${escapeHtml(input.footer ?? 'Email automático enviado pela plataforma Trimio.')}</p>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = [
    input.title,
    '',
    ...input.intro,
    '',
    ...(input.sections ?? []).flatMap((section) => [section.title, ...section.items, '']),
    ...(input.ctaLabel && input.ctaUrl ? [`${input.ctaLabel}: ${input.ctaUrl}`, ''] : []),
    ...(input.outro ?? []),
    '',
    input.footer ?? 'Email automático enviado pela plataforma Trimio.',
  ].join('\n').trim()

  return { html, text }
}

export async function sendEmail(payload: EmailPayload) {
  if (!canSendEmail()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email delivery is not configured')
    }

    console.log('[mail:dev]', {
      subject: payload.subject,
      text: payload.text,
      to: payload.to,
    })
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requiredEnv('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: requiredEnv('MAIL_FROM'),
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Email delivery failed: ${response.status} ${body}`)
  }
}
