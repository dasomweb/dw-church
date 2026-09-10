import { prisma } from '../../config/database.js';

/**
 * 보안 이벤트 기록/조회. public.security_events (전역, 슈퍼어드민 모니터링용).
 * 기록은 fire-and-forget — 감사 로깅 때문에 실제 요청이 실패하면 안 된다.
 */
export interface SecurityEventInput {
  eventType: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  actorTenantSlug?: string | null;
  targetTenantSlug?: string | null;
  targetPath?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detail?: string | null;
}

export async function recordSecurityEvent(e: SecurityEventInput): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.security_events
         (event_type, actor_user_id, actor_email, actor_role, actor_tenant_slug,
          target_tenant_slug, target_path, ip, user_agent, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      e.eventType,
      e.actorUserId ?? null, e.actorEmail ?? null, e.actorRole ?? null, e.actorTenantSlug ?? null,
      e.targetTenantSlug ?? null, (e.targetPath ?? null)?.toString().slice(0, 500) ?? null,
      e.ip ?? null, (e.userAgent ?? null)?.toString().slice(0, 500) ?? null,
      (e.detail ?? null)?.toString().slice(0, 1000) ?? null,
    );
  } catch {
    // 감사 로깅 실패는 요청을 막지 않는다.
  }
}

export async function listSecurityEvents(opts: { limit?: number; type?: string } = {}) {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
  const params: unknown[] = [];
  let where = '';
  if (opts.type) { where = 'WHERE event_type = $1'; params.push(opts.type); }
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM public.security_events ${where} ORDER BY created_at DESC LIMIT ${limit}`,
    ...params,
  );
}
