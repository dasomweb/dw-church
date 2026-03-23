import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { validateSlug } from '../utils/validate-schema.js';

export const prisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

const tenantConnections = new Map<string, PrismaClient>();

export function getTenantConnection(slug: string): PrismaClient {
  validateSlug(slug);
  const cached = tenantConnections.get(slug);
  if (cached) return cached;

  const client = new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Set search_path before returning the client
  // In Prisma 6, $use middleware was removed. We use $extends instead.
  const extended = client.$extends({
    query: {
      $allOperations({ args, query }: { args: unknown; query: (args: unknown) => Promise<unknown> }) {
        return client.$executeRawUnsafe(`SET search_path TO "tenant_${slug}", public`).then(() => query(args));
      },
    },
  }) as unknown as PrismaClient;

  tenantConnections.set(slug, extended);
  return extended;
}

export async function disconnectAllTenants(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const [, client] of tenantConnections) {
    promises.push(client.$disconnect());
  }
  await Promise.all(promises);
  tenantConnections.clear();
}
