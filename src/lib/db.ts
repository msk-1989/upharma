import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In development, reuse the same PrismaClient across hot-reloads.
// In production (Vercel serverless), each function invocation may
// create a new instance, but the connection pool in @prisma/client
// handles connection reuse efficiently.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
