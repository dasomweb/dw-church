import type { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteSchema,
} from './schema.js';
import * as authService from './service.js';

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
}
