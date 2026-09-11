import type { FastifyInstance } from 'fastify';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth.js';
import { recordSecuritySchema } from './schema.js';
import { recordSecurityEvent, listSecurityEvents } from './service.js';

/**
 * 보안 이벤트 API.
 *  POST /security-events  — 인증된 사용자(주로 관리자 SPA의 '권한없음' 화면)가 감지한
 *                           접근 위반을 신고. actor 정보는 JWT 에서 채운다(위조 불가).
 *  GET  /security-events  — 슈퍼어드민만 조회(모니터링). 목록 UI 는 다음 단계.
 */
export async function securityRoutes(app: FastifyInstance): Promise<void> {
  app.post('/security-events', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = recordSecuritySchema.parse(request.body);
    await recordSecurityEvent({
      eventType: body.eventType,
      actorUserId: request.user?.id ?? null,
      actorEmail: request.user?.email ?? null,
      actorRole: request.user?.role ?? null,
      actorTenantSlug: request.user?.tenantSlug ?? null,
      targetTenantSlug: body.targetTenantSlug ?? null,
      targetPath: body.targetPath ?? null,
      ip: request.ip,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
      detail: body.detail ?? null,
    });
    return reply.status(201).send({ data: { recorded: true } });
  });

  const listHandler = async (request: any, reply: any) => {
    const q = request.query as { limit?: string; type?: string };
    return reply.send({
      data: await listSecurityEvents({ limit: q.limit ? Number(q.limit) : undefined, type: q.type }),
    });
  };
  app.get('/security-events', { preHandler: [requireSuperAdmin] }, listHandler);
  // /admin/* 별칭 — 슈퍼어드민 콘솔의 useAdminApi 가 /api/v1/admin/* 로 호출하므로.
  app.get('/admin/security-events', { preHandler: [requireSuperAdmin] }, listHandler);
}
