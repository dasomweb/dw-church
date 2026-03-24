import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { parsePagination } from '../../utils/pagination.js';
import { createTenantSchema, updateTenantSchema } from './schema.js';
import * as tenantService from './service.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { prisma } from '../../config/database.js';

const SUPER_ADMIN_EMAILS = env.SUPER_ADMIN_EMAILS;

async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  if (!request.user?.email || !SUPER_ADMIN_EMAILS.includes(request.user.email)) {
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

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { tenant_id: tenant.id, tenant_slug: tenant.slug },
      });
      if (error) {
        throw new AppError('UPDATE_FAILED', 500, error.message);
      }

      return reply.send({ success: true, tenantId: tenant.id, tenantSlug: tenant.slug });
    },
  );
}
