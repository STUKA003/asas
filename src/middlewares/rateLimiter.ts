import rateLimit from 'express-rate-limit'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Demasiadas tentativas de login. Tenta novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

function buildLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  })
}

export const publicLookupLimiter = buildLimiter(
  10 * 60 * 1000,
  20,
  'Demasiadas tentativas. Tenta novamente dentro de alguns minutos.'
)

export const publicAvailabilityLimiter = buildLimiter(
  60 * 1000,
  120,
  'Demasiados pedidos de disponibilidade. Tenta novamente daqui a pouco.'
)

export const publicWriteLimiter = buildLimiter(
  15 * 60 * 1000,
  20,
  'Demasiadas tentativas de submissão. Tenta novamente mais tarde.'
)

export const authEmailLimiter = buildLimiter(
  15 * 60 * 1000,
  10,
  'Demasiados pedidos relacionados com email. Tenta novamente mais tarde.'
)
