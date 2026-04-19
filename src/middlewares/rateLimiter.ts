import rateLimit from 'express-rate-limit'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Demasiadas tentativas de login. Tenta novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})
