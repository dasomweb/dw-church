import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { parsePagination } from '../../utils/pagination.js';
import { createTenantSchema, updateTenantSchema } from './schema.js';
import * as tenantService from './service.js';
import { prisma } from '../../config/database.js';

const BCRYPT_ROUNDS = 12;

/**
 * Require super_admin role.
 * Primary: user_metadata.role === 'super_admin' (DB-driven)
 * Fallback: SUPER_ADMIN_EMAILS env var (for bootstrap only)
 */
async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) {
    throw new AppError('FORBIDDEN', 403, 'Super admin access required');
  }
}

export default async function tenantRoutes(app: FastifyInstance): Promise<void> {
  // All routes require super admin
  app.addHook('preHandler', requireSuperAdmin);

  // GET /admin/tenants
  app.get('/tenants', async (request, reply) => {
    const { page, perPage } = parsePagination(
      request.query as Record<string, unknown>,
    );
    const result = await tenantService.listTenants(page, perPage);
    return reply.send(result);
  });

  // POST /admin/tenants
  app.post('/tenants', async (request, reply) => {
    const body = createTenantSchema.parse(request.body);
    const tenant = await tenantService.createTenant(body);
    return reply.status(201).send(tenant);
  });

  // PUT /admin/tenants/:id
  app.put<{ Params: { id: string } }>(
    '/tenants/:id',
    async (request, reply) => {
      const body = updateTenantSchema.parse(request.body);
      const tenant = await tenantService.updateTenant(request.params.id, body);
      return reply.send(tenant);
    },
  );

  // DELETE /admin/tenants/:id
  app.delete<{ Params: { id: string } }>(
    '/tenants/:id',
    async (request, reply) => {
      const result = await tenantService.deleteTenant(request.params.id);
      return reply.send(result);
    },
  );

  // GET /admin/stats
  app.get('/stats', async (_request, reply) => {
    const stats = await tenantService.getGlobalStats();
    return reply.send(stats);
  });

  // GET /admin/tenants/:id/stats — Detailed stats for a single tenant
  app.get<{ Params: { id: string } }>(
    '/tenants/:id/stats',
    async (request, reply) => {
      const stats = await tenantService.getTenantDetailedStats(request.params.id);
      return reply.send(stats);
    },
  );

  // ─── Domain management ───────────────────────────────────────

  // GET /admin/domains — List all domains across all tenants
  app.get('/domains', async (_request, reply) => {
    const domains = await prisma.tenantDomain.findMany({
      include: {
        tenant: { select: { id: true, slug: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      data: domains.map((d) => ({
        id: d.id,
        domain: d.domain,
        isVerified: d.verified,
        createdAt: d.createdAt.toISOString(),
        tenant: d.tenant,
      })),
      total: domains.length,
    });
  });

  // DELETE /admin/domains/:id — Delete a domain
  app.delete<{ Params: { id: string } }>(
    '/domains/:id',
    async (request, reply) => {
      const { id } = request.params;

      const domain = await prisma.tenantDomain.findUnique({ where: { id } });
      if (!domain) {
        throw new AppError('NOT_FOUND', 404, 'Domain not found');
      }

      await prisma.tenantDomain.delete({ where: { id } });
      return reply.send({ success: true, message: `Domain '${domain.domain}' deleted` });
    },
  );

  // PUT /admin/domains/:id/verify — Manually mark domain as verified
  app.put<{ Params: { id: string } }>(
    '/domains/:id/verify',
    async (request, reply) => {
      const { id } = request.params;

      const domain = await prisma.tenantDomain.findUnique({ where: { id } });
      if (!domain) {
        throw new AppError('NOT_FOUND', 404, 'Domain not found');
      }

      const updated = await prisma.tenantDomain.update({
        where: { id },
        data: { verified: true },
      });

      return reply.send({
        success: true,
        domain: updated.domain,
        isVerified: updated.verified,
      });
    },
  );

  // ─── User lock/unlock ────────────────────────────────────────

  // PUT /admin/users/:userId/lock — Deactivate a user
  app.put<{ Params: { userId: string } }>(
    '/users/:userId/lock',
    async (request, reply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError('USER_NOT_FOUND', 404, 'User not found');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      return reply.send({ success: true, userId, isActive: false });
    },
  );

  // PUT /admin/users/:userId/unlock — Reactivate a user
  app.put<{ Params: { userId: string } }>(
    '/users/:userId/unlock',
    async (request, reply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError('USER_NOT_FOUND', 404, 'User not found');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });

      return reply.send({ success: true, userId, isActive: true });
    },
  );

  // PUT /admin/users/:userId/tenant — Reassign a user to a different tenant
  app.put<{ Params: { userId: string }; Body: { tenantSlug: string } }>(
    '/users/:userId/tenant',
    async (request, reply) => {
      const { userId } = request.params;
      const { tenantSlug } = request.body as { tenantSlug: string };

      const tenant = await prisma.tenant.findFirst({
        where: { slug: tenantSlug, isActive: true },
        select: { id: true, slug: true },
      });
      if (!tenant) {
        throw new AppError('TENANT_NOT_FOUND', 404, `Tenant '${tenantSlug}' not found`);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { tenantId: tenant.id, tenantSlug: tenant.slug },
      });

      return reply.send({ success: true, tenantId: tenant.id, tenantSlug: tenant.slug });
    },
  );

  // PUT /admin/users/:userId/role — Update a user's role
  app.put<{ Params: { userId: string } }>(
    '/users/:userId/role',
    async (request, reply) => {
      const { userId } = request.params;
      const { role } = request.body as { role: string };

      const validRoles = ['super_admin', 'owner', 'admin', 'editor', 'member'];
      if (!validRoles.includes(role)) {
        throw new AppError('VALIDATION_ERROR', 400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError('USER_NOT_FOUND', 404, 'User not found');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      return reply.send({ success: true, userId, role });
    },
  );

  // PUT /admin/users/:userId/password — Force-reset a user's password (super admin)
  app.put<{ Params: { userId: string } }>(
    '/users/:userId/password',
    async (request, reply) => {
      const { userId } = request.params;
      const { password } = request.body as { password: string };

      if (!password || password.length < 8) {
        throw new AppError('VALIDATION_ERROR', 400, 'Password must be at least 8 characters');
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return reply.send({ success: true, message: 'Password updated' });
    },
  );

  // PUT /admin/users/:userId/status — Toggle user active status
  app.put<{ Params: { userId: string } }>(
    '/users/:userId/status',
    async (request, reply) => {
      const { userId } = request.params;
      const { isActive, is_active } = request.body as { isActive?: boolean; is_active?: boolean };
      const active = isActive ?? is_active;
      if (active === undefined) {
        throw new AppError('VALIDATION_ERROR', 400, 'isActive is required');
      }

      // Prevent deactivating super_admin
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role === 'super_admin' && !active) {
        throw new AppError('FORBIDDEN', 403, 'Super Admin cannot be deactivated');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: active },
      });

      return reply.send({ success: true, message: `User ${active ? 'activated' : 'deactivated'}` });
    },
  );

  // GET /admin/tenants/:slug/pages — List pages for a tenant (for migration matching)
  app.get<{ Params: { slug: string } }>('/tenants/:slug/pages', async (request, reply) => {
    const schema = `tenant_${request.params.slug}`;
    try {
      const pages = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, title, slug, is_home, status, sort_order FROM "${schema}".pages ORDER BY sort_order ASC`
      );
      return reply.send({ data: pages });
    } catch {
      return reply.send({ data: [] });
    }
  });

  // GET /admin/users — List all users
  app.get('/users', async (_request, reply) => {
    const users = await prisma.user.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantSlug: true,
        tenantId: true,
        createdAt: true,
        isActive: true,
      },
    });

    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      tenantSlug: u.tenantSlug ?? '',
      tenantId: u.tenantId ?? '',
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      lastSignIn: null,
    }));

    return reply.send({ data: mapped, total: mapped.length });
  });
}
