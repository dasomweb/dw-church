import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../config/supabase.js';
import { prisma } from '../config/database.js';
import { AppError } from './error-handler.js';

function extractToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

async function resolveUser(
  request: FastifyRequest,
  token: string,
): Promise<void> {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired token');
  }

  const tenantId = (user.user_metadata?.tenant_id as string) ?? '';
  const tenantSlug = (user.user_metadata?.tenant_slug as string) ?? '';
  const role = (user.user_metadata?.role as string) ?? 'member';

  request.user = {
    id: user.id,
    email: user.email ?? '',
    tenantId,
    tenantSlug,
    role,
  };

  // If tenant middleware didn't resolve tenant (e.g. api.dasomchurch.org),
  // fill it from JWT token
  if (!request.tenant && tenantSlug) {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: { id: true, slug: true, name: true, plan: true },
    });
    if (tenant) {
      request.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
      };
      request.tenantSchema = `tenant_${tenant.slug}`;
    }
  }
}

/**
 * Require any authenticated user.
 */
export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const token = extractToken(request);
  if (!token) {
    throw new AppError('UNAUTHORIZED', 401, 'Missing authorization token');
  }
  await resolveUser(request, token);
}

/**
 * Require admin or owner role.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  const role = request.user?.role;
  if (role !== 'admin' && role !== 'owner') {
    throw new AppError('FORBIDDEN', 403, 'Admin access required');
  }
}

/**
 * Require owner role.
 */
export async function requireOwner(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  if (request.user?.role !== 'owner') {
    throw new AppError('FORBIDDEN', 403, 'Owner access required');
  }
}

/**
 * Optionally authenticate — sets request.user if a valid token is present,
 * otherwise continues without error.
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const token = extractToken(request);
  if (!token) return;

  try {
    await resolveUser(request, token);
  } catch {
    // Silently continue — user stays undefined
  }
}
