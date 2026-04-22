import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AppError } from './error-handler.js';
import { validateSchemaName } from '../utils/validate-schema.js';
import type { JwtPayload } from '../config/jwt.js';

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
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired token');
  }

  request.user = {
    id: payload.userId,
    email: payload.email,
    tenantId: payload.tenantId ?? '',
    tenantSlug: payload.tenantSlug ?? '',
    role: payload.role ?? 'member',
  };

  // If tenant middleware didn't resolve tenant (e.g. api.truelight.app),
  // fill it from JWT token
  if (!request.tenant && payload.tenantSlug) {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: payload.tenantSlug, isActive: true },
      select: { id: true, slug: true, name: true, plan: true },
    });
    if (tenant) {
      request.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
      };
      request.tenantSchema = validateSchemaName(`tenant_${tenant.slug}`);
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
 * Require admin, owner, or support role. super_admin has all permissions.
 * support = per-tenant maintenance account provisioned for the super admin;
 * same content-edit scope as admin, but requireOwner excludes it.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  const role = request.user?.role;
  if (role !== 'admin' && role !== 'owner' && role !== 'support' && role !== 'super_admin') {
    throw new AppError('FORBIDDEN', 403, 'Admin access required');
  }
}

/**
 * Require owner role. super_admin has all permissions.
 */
export async function requireOwner(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  const role = request.user?.role;
  if (role !== 'owner' && role !== 'super_admin') {
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
