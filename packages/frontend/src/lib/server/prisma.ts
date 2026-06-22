import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  __launchpadPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__launchpadPrisma) {
    globalForPrisma.__launchpadPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return globalForPrisma.__launchpadPrisma;
}
