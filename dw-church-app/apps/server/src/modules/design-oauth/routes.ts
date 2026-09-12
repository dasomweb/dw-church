/**
 * Claude Design OAuth routes (super-admin). Lets the console connect to the
 * operator's claude.ai Design account so the server can fetch a canvas via the
 * design MCP. See service.ts for the OAuth mechanics.
 *
 *   POST   /design/oauth/start     → { authorizeUrl }   (super-admin; open in popup)
 *   GET    /design/oauth/callback  → HTML (PUBLIC; OAuth redirect, state-validated)
 *   GET    /design/oauth/status    → { connected, scope, expiresAt }  (super-admin)
 *   DELETE /design/oauth           → disconnect  (super-admin)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { startAuth, handleCallback, getStatus, disconnect } from './service.js';

async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) {
    throw new AppError('FORBIDDEN', 403, 'Super admin access required');
  }
}

const userIdOf = (request: FastifyRequest): string => request.user?.id ?? request.user?.email ?? '';

/** Popup page: notify the opener (admin) and self-close. */
function popupHtml(ok: boolean, msg: string): string {
  const payload = JSON.stringify({ type: 'design-oauth', ok });
  const color = ok ? '#16a34a' : '#dc2626';
  return `<!doctype html><meta charset="utf-8"><title>Claude Design</title>` +
    `<body style="font-family:system-ui,sans-serif;padding:48px;text-align:center;color:#16181d">` +
    `<p style="font-size:16px;font-weight:600;color:${color}">${ok ? '✓ ' : '✗ '}${msg}</p>` +
    `<p style="font-size:13px;color:#61697a">이 창은 자동으로 닫힙니다. 안 닫히면 직접 닫아 주세요.</p>` +
    `<script>try{window.opener&&window.opener.postMessage(${payload},'*')}catch(e){}setTimeout(function(){window.close()},1200)</script>` +
    `</body>`;
}

export async function designOauthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/design/oauth/start', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const userId = userIdOf(request);
    if (!userId) throw new AppError('UNAUTHORIZED', 401, 'no user');
    const { authorizeUrl } = await startAuth(userId);
    return reply.send({ data: { authorizeUrl } });
  });

  // PUBLIC — the browser lands here from claude.ai after consent (no auth header);
  // the unguessable `state` (stored server-side with the user) authenticates it.
  app.get('/design/oauth/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };
    if (error) return reply.type('text/html').send(popupHtml(false, `Claude Design 인증 취소/오류: ${error}`));
    if (!code || !state) return reply.type('text/html').send(popupHtml(false, 'code/state 누락'));
    try {
      await handleCallback(code, state);
      return reply.type('text/html').send(popupHtml(true, 'Claude Design 연결됨'));
    } catch (e) {
      return reply.type('text/html').send(popupHtml(false, e instanceof Error ? e.message : '연결 실패'));
    }
  });

  app.get('/design/oauth/status', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    return reply.send({ data: await getStatus(userIdOf(request)) });
  });

  app.delete('/design/oauth', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    await disconnect(userIdOf(request));
    return reply.send({ data: { connected: false } });
  });
}
