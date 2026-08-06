import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client to avoid connection exhaustion
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

/**
 * Checks that the configured database is reachable. Ported from the
 * now-removed src/lib/db.ts (P1-4 — that file was a second, independent
 * PrismaClient singleton; consolidated to this one, the more widely-used
 * of the two, per docs/architecture-review/15_Implementation_Backlog.md P1-4).
 */
export async function testConnection() {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
