import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AppError } from './error-handler.js';

const SKIP_PREFIXES = ['/api/v1/auth/register', '/api/v1/admin', '/api/v1/billing', '/health'];

const SYSTEM_SUBDOMAINS = new Set(['api', 'admin', 'www', 'mail', 'ftp', 'staging', 'dev']);

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  if (!host) return null;
  const parts = host.split('.');

  // Needs at least 3 parts: subdomain.domain.tld
  if (parts.length < 3) return null;

  // localhost special case: subdomain.localhost
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0] ?? null;
  }

  const subdomain = parts[0] ?? null;

  // Skip system subdomains (api, admin, www, etc.)
  if (subdomain && SYSTEM_SUBDOMAINS.has(subdomain)) return null;

  return subdomain;
}

export async function tenantMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (shouldSkip(request.url)) return;

  const slug = extractSubdomain(request.hostname);
  if (!slug) return; // System subdomain or no subdomain — skip tenant resolution

  const tenant = await prisma.tenant.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true, plan: true, isActive: true },
  });

  if (!tenant) {
    throw new AppError(
      'TENANT_NOT_FOUND',
      404,
      `Tenant '${slug}' not found or inactive`,
    );
  }

  request.tenant = {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    plan: tenant.plan,
  };
  request.tenantSchema = `tenant_${tenant.slug}`;
}
