import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// Kept on the server's global object in production too, so the pages, the API routes and the
// once-a-minute alerts check (which starts separately, in instrumentation.ts) all share one
// database connection pool instead of each opening their own.
globalForPrisma.prisma = prisma
