type EmailPayload = {
  html: string
  subject: string
  text: string
  to: string
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
