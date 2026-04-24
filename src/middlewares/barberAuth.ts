import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

export interface BarberAuthPayload {
  barberId: string
  barbershopId: string
}

declare global {
  namespace Express {
    interface Request {
      barberAuth: BarberAuthPayload
    }
  }
}

export async function authenticateBarber(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as BarberAuthPayload & { type: string }
    if (payload.type !== 'barber') {
      res.status(401).json({ error: 'Invalid token type' })
      return
    }
    req.barberAuth = { barberId: payload.barberId, barbershopId: payload.barbershopId }

    const barbershop = await prisma.barbershop.findUnique({
      where: { id: payload.barbershopId },
      select: { suspended: true },
    })
    if (barbershop?.suspended) {
      res.status(403).json({ error: 'Conta suspensa', code: 'SUSPENDED' })
      return
    }

    const barber = await prisma.barber.findFirst({
      where: {
        id: payload.barberId,
        barbershopId: payload.barbershopId,
        active: true,
        password: { not: null },
      },
      select: { id: true },
    })
    if (!barber) {
      res.status(401).json({ error: 'Barbeiro sem acesso ativo' })
      return
    }

    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
