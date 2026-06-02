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

  // Cross-tenant protection:
  // tenantMiddleware (global preHandler) may have resolved request.tenant
  // from the X-Tenant-Slug header BEFORE auth ran. For authenticated users,
  // the JWT's tenantSlug is the source of truth — if the header-resolved
  // tenant disagrees, the user was trying to read a tenant they don't own.
  // Override with the JWT's tenant, or 403 for role 'support' (the narrow
  // per-tenant maintenance role must never cross tenants, even by accident).
  if (payload.tenantSlug && request.tenant && request.tenant.slug !== payload.tenantSlug) {
    if (payload.role === 'support') {
      throw new AppError('FORBIDDEN', 403, 'Support session cannot access another tenant');
    }
    // super_admin and other cross-tenant-capable roles get silently rebound
    // to their JWT tenant; the mismatched header was either stale or hostile.
    request.tenant = undefined;
    request.tenantSchema = undefined;
  }

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
 * Require super_admin role exclusively. Used by AI builder endpoints
 * (planner-proxy / build-pages / builder-routes / jobs) — these create
 * pages/sections/menus on a target tenant's schema as a privileged op
 * and must never be reachable by regular tenant owners.
 *
 * (Phase 11-A2 — added when porting b2bsmart's AI builder which used
 * the same gate. Different from requireOwner which also accepts the
 * owner role.)
 */
export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  if (request.user?.role !== 'super_admin') {
    throw new AppError('FORBIDDEN', 403, 'Super admin access required');
  }
}

/**
 * Plan gate — return a preHandler that requires the tenant's plan to be
 * one of the allowed values. super_admin bypasses (they can do anything
 * on any tenant). Use as a per-route preHandler stacked after
 * requireAuth/requireOwner, e.g.
 *
 *   app.post('/', { preHandler: [requireAuth, requirePlan(['pro', 'enterprise'])] }, ...)
 *
 * Pricing model (2026-06-01): Basic = content editing only, Pro = + page
 * addition. So POST /pages and POST /pages/:id/sections are gated to
 * pro/enterprise. PATCH/PUT to existing sections stays open to Basic.
 */
export function requirePlan(allowed: string[]) {
  return async function planGate(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    // super_admin always bypasses the plan check — they may need to make
    // structural changes on any tenant regardless of that tenant's plan.
    if (request.user?.role === 'super_admin') return;

    const plan = request.tenant?.plan ?? '';
    if (!allowed.includes(plan)) {
      throw new AppError(
        'PLAN_UPGRADE_REQUIRED',
        403,
        `이 기능은 ${allowed.join(' 또는 ')} 플랜에서 사용할 수 있습니다. (현재: ${plan || 'unknown'})`,
      );
    }
  };
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
