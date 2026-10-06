
import { PrismaClient } from '@prisma/client'
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

  const adapter = new PrismaPg({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  })

  return new PrismaClient({
    adapter,
  })
}

// Singleton getter — reuses one Prisma client across the process
// and across hot-reloads in development via globalThis.
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

// Lazy proxy — only creates the real client when first accessed.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = getPrismaClient()
    return client[prop as keyof PrismaClient]
  },
})

