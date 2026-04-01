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
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await authService.register(body);
    return reply.status(201).send(result);
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

  // PUT /auth/switch-tenant — Owner can switch to a tenant they own
  app.put(
    '/switch-tenant',
    { preHandler: [requireAuth] },
    async (request, reply) => {
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

  // GET /auth/bootstrap-reset?email=...&password=...
  // Emergency one-time password reset. Only SUPER_ADMIN_EMAILS. No auth required.
  // Uses GET to avoid Fastify body-parser issues on Railway.
  app.get('/bootstrap-reset', async (request, reply) => {
    const { email, password } = request.query as { email?: string; password?: string };
    if (!email || !password || password.length < 8) {
      throw new AppError('VALIDATION_ERROR', 400, 'email and password query params required (min 8 chars)');
    }
    const { env } = await import('../../config/env.js');
    if (!env.SUPER_ADMIN_EMAILS.includes(email)) {
      throw new AppError('FORBIDDEN', 403, 'Only super admin emails can use bootstrap reset');
    }
    await authService.bootstrapResetPassword(email, password);
    return reply.send({ message: 'Password reset successfully', email });
  });
}
