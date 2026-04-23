import crypto from 'node:crypto'
import type { AuthTokenType, User } from '@prisma/client'
import { prisma } from './prisma'
import { renderEmailTemplate, sendEmail } from './email'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function appUrl() {
  const configured = process.env.APP_URL?.trim()
  if (!configured) {
    throw new Error('Missing required env var: APP_URL')
  }
  return configured.replace(/\/+$/, '')
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex')
}

async function issueToken(userId: string, type: AuthTokenType, ttlMinutes: number) {
  const token = makeToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)

  await prisma.authToken.deleteMany({
    where: {
      userId,
      type,
      consumedAt: null,
    },
  })

  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash,
      expiresAt,
    },
  })

  return token
}

export async function issueEmailVerification(user: Pick<User, 'id' | 'email' | 'name'>, slug: string) {
  const token = await issueToken(user.id, 'EMAIL_VERIFICATION', 60 * 24)
  const verifyUrl = `${appUrl()}/verify-email?token=${token}`
  const message = renderEmailTemplate({
    preheader: 'Confirma o teu email para ativares a conta da tua barbearia na Trimio.',
    title: 'Confirma o teu email',
    intro: [
      `Olá ${user.name},`,
      'A tua conta foi criada com sucesso. Falta só confirmar o email para ativares o acesso ao painel.',
    ],
    sections: [
      {
        title: 'Conta',
        items: [
          `Barbearia: ${slug}`,
          'Este link expira dentro de 24 horas.',
        ],
      },
    ],
    ctaLabel: 'Confirmar email',
    ctaUrl: verifyUrl,
    outro: [
      'Se não foste tu a criar esta conta, podes ignorar esta mensagem.',
    ],
    footer: 'Trimio · confirmação de conta',
  })

  await sendEmail({
    to: user.email,
    subject: 'Confirma o teu email na Trimio',
    text: message.text,
    html: message.html,
  })
}

export async function issuePasswordReset(user: Pick<User, 'id' | 'email' | 'name'>, slug: string) {
  const token = await issueToken(user.id, 'PASSWORD_RESET', 30)
  const resetUrl = `${appUrl()}/admin/reset-password?token=${token}`
  const message = renderEmailTemplate({
    preheader: 'Recebemos um pedido para redefinir a password da tua conta.',
    title: 'Redefinir password',
    intro: [
      `Olá ${user.name},`,
      `Recebemos um pedido para redefinir a password da conta ${slug}.`,
    ],
    sections: [
      {
        title: 'Segurança',
        items: [
          'Este link expira em 30 minutos.',
          'Se não reconheces este pedido, ignora o email e mantém a password atual.',
        ],
      },
    ],
    ctaLabel: 'Redefinir password',
    ctaUrl: resetUrl,
    footer: 'Trimio · recuperação de acesso',
  })

  await sendEmail({
    to: user.email,
    subject: 'Redefinir password da tua conta Trimio',
    text: message.text,
    html: message.html,
  })
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  const tokenHash = hashToken(token)

  const record = await prisma.authToken.findFirst({
    where: {
      tokenHash,
      type,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          barbershopId: true,
        },
      },
    },
  })

  if (!record) {
    return null
  }

  await prisma.authToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })

  return record
}
