/**
 * Claude Design OAuth routes. Connects the console to the operator's claude.ai
 * Design account via a one-time LOCAL connector (Anthropic's design MCP OAuth is
 * native-app / loopback-only — a server-hosted https callback can never register;
 * see service.ts for the verified constraint).
 *
 *   POST   /design/oauth/local/init      → { connectToken, command }  (super-admin)
 *   POST   /design/oauth/local/complete  → { ok }  (PUBLIC; connect_token-authed — the connector posts tokens)
 *   GET    /design/oauth/status          → { connected, scope, expiresAt }  (super-admin)
 *   DELETE /design/oauth                 → disconnect  (super-admin)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { initLocalConnect, completeLocalConnect, getStatus, disconnect, getAccessToken } from './service.js';
import { probeTools } from './mcp-client.js';

async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) {
    throw new AppError('FORBIDDEN', 403, 'Super admin access required');
  }
}

const userIdOf = (request: FastifyRequest): string => request.user?.id ?? request.user?.email ?? '';

export async function designOauthRoutes(app: FastifyInstance): Promise<void> {
  // Mint the single-use connect_token + local command for the operator.
  app.post('/design/oauth/local/init', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const userId = userIdOf(request);
    if (!userId) throw new AppError('UNAUTHORIZED', 401, 'no user');
    return reply.send({ data: await initLocalConnect(userId) });
  });

  // PUBLIC — the local connector posts the tokens it obtained. Authenticated by
  // the unguessable, single-use, 15-min connect_token (validated server-side), so
  // no TrueLight JWT ever leaves the operator's browser.
  app.post('/design/oauth/local/complete', async (request, reply) => {
    const body = (request.body ?? {}) as {
      connectToken?: string; clientId?: string; accessToken?: string;
      refreshToken?: string | null; expiresIn?: number | null; scope?: string | null;
    };
    if (!body.connectToken || !body.clientId || !body.accessToken) {
      throw new AppError('BAD_REQUEST', 400, 'connectToken/clientId/accessToken 필수');
    }
    try {
      await completeLocalConnect({
        connectToken: body.connectToken,
        clientId: body.clientId,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken ?? null,
        expiresIn: body.expiresIn ?? null,
        scope: body.scope ?? null,
      });
      return reply.send({ data: { ok: true } });
    } catch (e) {
      throw new AppError('BAD_REQUEST', 400, e instanceof Error ? e.message : '연결 실패');
    }
  });

  app.get('/design/oauth/status', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    return reply.send({ data: await getStatus(userIdOf(request)) });
  });

  app.delete('/design/oauth', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    await disconnect(userIdOf(request));
    return reply.send({ data: { connected: false } });
  });

  // Diagnostic — verify the stored token actually reaches the design MCP and
  // dump the live tools/list (names + inputSchemas). Finalizes fetch args against
  // reality on first connect; never guessed.
  app.post('/design/oauth/mcp/probe', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const token = await getAccessToken(userIdOf(request));
    const tools = await probeTools(token);
    return reply.send({ data: { tools } });
  });
}
