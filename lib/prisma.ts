import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    // During build, return a no-op client to prevent errors
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('[Prisma] Skipping real client creation during build')
      return new PrismaClient()
    }
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

// Singleton getter — reuses one client (and one pg Pool) across the whole
// process, and across hot-reloads in dev via globalThis.
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

// Lazy proxy - only touches the real client (and DATABASE_URL) on first
// actual property access, not at import time.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = getPrismaClient()
    return client[prop as keyof PrismaClient]
  },
})