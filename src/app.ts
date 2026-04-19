import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authenticate } from './middlewares/auth'

import authRouter from './modules/auth/router'
import publicRouter from './modules/public/router'
import barbershopsRouter from './modules/barbershops/router'
import barbersRouter from './modules/barbers/router'
import servicesRouter from './modules/services/router'
import extrasRouter from './modules/extras/router'
import productsRouter from './modules/products/router'
import plansRouter from './modules/plans/router'
import customersRouter from './modules/customers/router'
import bookingsRouter from './modules/bookings/router'
import workingHoursRouter from './modules/working-hours/router'
import blockedTimesRouter from './modules/blocked-times/router'
import superadminRouter from './modules/superadmin/router'
import barberAuthRouter from './modules/barber-auth/router'
import barberPortalRouter from './modules/barber-portal/router'
import notificationsRouter from './modules/notifications/router'

const app = express()

// Production runs behind Nginx, so Express must trust the first proxy hop
// to interpret client IPs and forwarded headers correctly.
app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRouter)
app.use('/api/public/:slug', publicRouter) // no auth — tenant identified by slug

app.use('/api/barbershop', authenticate, barbershopsRouter)
app.use('/api/barbers', authenticate, barbersRouter)
app.use('/api/services', authenticate, servicesRouter)
app.use('/api/extras', authenticate, extrasRouter)
app.use('/api/products', authenticate, productsRouter)
app.use('/api/plans', authenticate, plansRouter)
app.use('/api/customers', authenticate, customersRouter)
app.use('/api/bookings', authenticate, bookingsRouter)
app.use('/api/working-hours', authenticate, workingHoursRouter)
app.use('/api/blocked-times', authenticate, blockedTimesRouter)
app.use('/api/superadmin', superadminRouter)
app.use('/api/barber-auth', barberAuthRouter)
app.use('/api/barber-portal', barberPortalRouter)
app.use('/api/notifications', notificationsRouter)

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (process.env.NODE_ENV !== 'production') console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
