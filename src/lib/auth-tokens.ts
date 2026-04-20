import crypto from 'node:crypto'
import type { AuthTokenType, User } from '@prisma/client'
import { prisma } from './prisma'
import { sendEmail } from './email'

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

  await sendEmail({
    to: user.email,
    subject: 'Confirma o teu email na Trimio',
    text: [
      `Olá ${user.name},`,
      '',
      'Confirma o teu email para ativares a tua conta na Trimio.',
      `Barbearia: ${slug}`,
      `Link: ${verifyUrl}`,
      '',
      'Se não foste tu, ignora este email.',
    ].join('\n'),
    html: `
      <p>Olá ${user.name},</p>
      <p>Confirma o teu email para ativares a tua conta na Trimio.</p>
      <p><strong>Barbearia:</strong> ${slug}</p>
      <p><a href="${verifyUrl}">Confirmar email</a></p>
      <p>Se não foste tu, ignora este email.</p>
    `,
  })
}

export async function issuePasswordReset(user: Pick<User, 'id' | 'email' | 'name'>, slug: string) {
  const token = await issueToken(user.id, 'PASSWORD_RESET', 30)
  const resetUrl = `${appUrl()}/admin/reset-password?token=${token}`

  await sendEmail({
    to: user.email,
    subject: 'Redefinir password da tua conta Trimio',
    text: [
      `Olá ${user.name},`,
      '',
      `Recebemos um pedido para redefinir a password da conta ${slug}.`,
      `Link: ${resetUrl}`,
      '',
      'Este link expira em 30 minutos.',
      'Se não foste tu, ignora este email.',
    ].join('\n'),
    html: `
      <p>Olá ${user.name},</p>
      <p>Recebemos um pedido para redefinir a password da conta <strong>${slug}</strong>.</p>
      <p><a href="${resetUrl}">Redefinir password</a></p>
      <p>Este link expira em 30 minutos.</p>
      <p>Se não foste tu, ignora este email.</p>
    `,
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
