import type { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './schema.js';
import * as authService from './service.js';
import { checkIsSuperAdmin } from './service.js';
import { recordSecurityEvent } from '../security/service.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await authService.register(body);
    return reply.status(201).send(result);
  });

  // GET /auth/check-slug?slug=... — public availability check for the self-service
  // registration form. Same logic as the super-admin-scoped endpoint under
  // /admin/tenants/check-slug. Only surfaces yes/no + reason, no tenant details.
  app.get<{ Querystring: { slug?: string } }>('/check-slug', async (request, reply) => {
    const { checkSlugAvailability } = await import('../tenants/service.js');
    const result = await checkSlugAvailability(request.query.slug ?? '');
    return reply.send(result);
  });

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body);
    return reply.send(result);
  });

  // POST /auth/refresh
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    const result = await authService.refreshSession(refreshToken);
    return reply.send(result);
  });

  // POST /auth/logout
  app.post(
    '/logout',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const token = request.headers.authorization?.split(' ')[1];
      if (token) {
        await authService.logout(token);
      }
      return reply.status(204).send();
    },
  );

  // GET /auth/me
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const result = await authService.getMe(request.user!.id);
    return reply.send(result);
  });

  // PUT /auth/me
  app.put(
    '/me',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = updateProfileSchema.parse(request.body);
      const result = await authService.updateProfile(request.user!.id, body);
      return reply.send(result);
    },
  );

  // POST /auth/forgot-password
  app.post('/forgot-password', async (request, reply) => {
    const { email } = forgotPasswordSchema.parse(request.body);
    await authService.forgotPassword(email);
    return reply.send({ message: 'Password reset email sent' });
  });

  // POST /auth/reset-password
  app.post('/reset-password', async (request, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    }
    const { password } = resetPasswordSchema.parse(request.body);
    await authService.resetPassword(token, password);
    return reply.send({ message: 'Password updated successfully' });
  });

  // POST /auth/invite
  app.post(
    '/invite',
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const body = inviteSchema.parse(request.body);
      const result = await authService.inviteUser(
        body,
        request.user!.role,
        request.user!.tenantId,
        request.user!.tenantSlug,
      );
      return reply.status(201).send(result);
    },
  );

  // GET /auth/account-quota — plan-based admin-account limit + current usage
  app.get('/account-quota', { preHandler: [requireAuth] }, async (request, reply) => {
    const quota = await authService.getAccountQuota(request.user!.tenantId);
    return reply.send({ data: quota });
  });

  // PUT /auth/switch-tenant — super-admin only. Previously any authenticated
  // user could rebind their session (JWT) to ANY active tenant with no ownership
  // check → cross-tenant access. Now restricted to super_admin; denials logged.
  app.put(
    '/switch-tenant',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (!checkIsSuperAdmin(request.user!.role, request.user!.email)) {
        void recordSecurityEvent({
          eventType: 'switch_tenant_denied',
          actorUserId: request.user!.id, actorEmail: request.user!.email,
          actorRole: request.user!.role, actorTenantSlug: request.user!.tenantSlug,
          targetTenantSlug: (request.body as { tenantSlug?: string })?.tenantSlug ?? null,
          targetPath: request.url, ip: request.ip,
          userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
        });
        throw new AppError('FORBIDDEN', 403, '테넌트 전환 권한이 없습니다');
      }
      const { tenantSlug } = request.body as { tenantSlug: string };
      if (!tenantSlug) {
        throw new AppError('VALIDATION_ERROR', 400, 'tenantSlug is required');
      }

      const tenant = await prisma.tenant.findFirst({
        where: { slug: tenantSlug, isActive: true },
        select: { id: true, slug: true },
      });
      if (!tenant) {
        throw new AppError('TENANT_NOT_FOUND', 404, `Tenant '${tenantSlug}' not found`);
      }

      const result = await authService.switchTenant(request.user!.id, tenant.id, tenant.slug);

      return reply.send(result);
    },
  );

  // PUT /auth/change-password
  app.put(
    '/change-password',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = changePasswordSchema.parse(request.body);
      await authService.changePassword(
        request.user!.id,
        request.user!.email,
        body.currentPassword,
        body.newPassword,
      );
      return reply.send({ message: '비밀번호가 변경되었습니다.' });
    },
  );
}
