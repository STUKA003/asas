import { Prisma } from '@prisma/client'

function isPostgresDatabase() {
  return (process.env.DATABASE_URL ?? '').startsWith('postgres')
}

export async function lockBarberForUpdate(tx: Prisma.TransactionClient, barberId: string) {
  if (!isPostgresDatabase()) return

  await tx.$queryRaw`SELECT id FROM "Barber" WHERE id = ${barberId} FOR UPDATE`
}

export async function lockProductsForUpdate(tx: Prisma.TransactionClient, productIds: string[]) {
  if (!isPostgresDatabase() || productIds.length === 0) return

  await tx.$queryRaw`SELECT id FROM "Product" WHERE id IN (${Prisma.join(productIds)}) FOR UPDATE`
}
