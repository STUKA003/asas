import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function authenticateSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { role: string }
    if (payload.role !== 'SUPERADMIN') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
