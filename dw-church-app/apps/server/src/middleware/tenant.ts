import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AppError } from './error-handler.js';
import { validateSchemaName } from '../utils/validate-schema.js';

const SKIP_PREFIXES = ['/api/v1/auth/', '/api/v1/admin', '/api/v1/billing', '/api/v1/migration', '/api/v1/shared-images', '/health'];

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

  // 1. Check X-Tenant-Slug header (used by Next.js SSR)
  const headerSlug = request.headers['x-tenant-slug'] as string | undefined;
  if (headerSlug) {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: headerSlug, isActive: true },
      select: { id: true, slug: true, name: true, plan: true },
    });
    if (tenant) {
      request.tenant = { id: tenant.id, slug: tenant.slug, name: tenant.name, plan: tenant.plan };
      request.tenantSchema = validateSchemaName(`tenant_${tenant.slug}`);
      return;
    }
  }

  // 2. Check subdomain
  const slug = extractSubdomain(request.hostname);

  if (!slug) {
    // No subdomain resolved — check if the full hostname is a custom domain
    const host = request.hostname.split(':')[0];
    if (host) {
      const customTenant = await prisma.$queryRawUnsafe<
        { id: string; slug: string; name: string; plan: string }[]
      >(
        `SELECT id, slug, name, plan FROM public.tenants
         WHERE custom_domain = $1 AND is_active = true
         LIMIT 1`,
        host,
      );
      if (customTenant.length > 0) {
        const t = customTenant[0]!;
        request.tenant = { id: t.id, slug: t.slug, name: t.name, plan: t.plan };
        request.tenantSchema = validateSchemaName(`tenant_${t.slug}`);
        return;
      }
    }
    return; // System subdomain or no subdomain — skip tenant resolution
  }

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
  request.tenantSchema = validateSchemaName(`tenant_${tenant.slug}`);
}
