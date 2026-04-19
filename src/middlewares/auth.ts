import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

export interface AuthPayload {
  userId: string
  barbershopId: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      auth: AuthPayload
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
    req.auth = payload

    // Check suspension
    const barbershop = await prisma.barbershop.findUnique({
      where: { id: payload.barbershopId },
      select: { suspended: true, suspendedReason: true },
    })
    if (barbershop?.suspended) {
      res.status(403).json({
        error: 'Conta suspensa',
        reason: barbershop.suspendedReason ?? undefined,
        code: 'SUSPENDED',
      })
      return
    }

    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
