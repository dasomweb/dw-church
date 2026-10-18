import { prisma } from '../../config/database.js';
import { generateVapidKeys, invalidatePushCache, sendPush, type PushTarget } from '../../config/web-push.js';

/** public.push_settings 싱글톤 row. */
export interface PushSettingsRow {
  public_key: string;
  private_key: string;
  subject: string;
  updated_at: string | null;
}

export async function getPushSettings(): Promise<PushSettingsRow | null> {
  const rows = await prisma.$queryRawUnsafe<PushSettingsRow[]>(
    `SELECT public_key, private_key, subject, updated_at FROM public.push_settings WHERE id = 1`,
  );
  return rows[0] ?? null;
}

/**
 * 전체 테넌트의 활성 구독 수. 키 재생성이 얼마나 파괴적인지 화면에 보여주려고 센다
 * (키를 바꾸면 기존 구독이 전부 무효가 된다 — RFC 8292 §4.2).
 */
export async function countActiveSubscriptions(): Promise<number> {
  const schemas = await prisma.$queryRawUnsafe<{ nspname: string }[]>(
    `SELECT nspname FROM pg_namespace WHERE nspname LIKE 'tenant_%' AND nspname NOT LIKE '%_b_%' AND nspname NOT LIKE '%_snapshot'`,
  );
  let total = 0;
  for (const { nspname } of schemas) {
    try {
      const r = await prisma.$queryRawUnsafe<{ n: number }[]>(
        `SELECT count(*)::int AS n FROM "${nspname}".push_subscriptions WHERE is_active = true`,
      );
      total += Number(r[0]?.n ?? 0);
    } catch {
      // 아직 테이블이 없는 스키마(배포 직후)는 건너뛴다.
    }
  }
  return total;
}

/** 키쌍 생성 후 저장. 기존 구독 무효화는 호출자(라우트)가 확인시킨 뒤 호출한다. */
export async function regenerateKeys(subject: string): Promise<PushSettingsRow> {
  const { publicKey, privateKey } = generateVapidKeys();
  await prisma.$executeRawUnsafe(
    `UPDATE public.push_settings
     SET public_key = $1, private_key = $2, subject = $3, updated_at = NOW()
     WHERE id = 1`,
    publicKey, privateKey, subject,
  );
  invalidatePushCache();
  return (await getPushSettings())!;
}

/** 연락처만 변경(키는 그대로). */
export async function updateSubject(subject: string): Promise<PushSettingsRow> {
  await prisma.$executeRawUnsafe(
    `UPDATE public.push_settings SET subject = $1, updated_at = NOW() WHERE id = 1`,
    subject,
  );
  invalidatePushCache();
  return (await getPushSettings())!;
}

/* ── 테넌트 구독 ───────────────────────────────────────────── */

export interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  is_active: boolean;
}

export interface SaveSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  platform?: string;
  memberId?: string | null;
}

/**
 * 구독 저장(업서트). 같은 기기가 다시 구독하면 endpoint 가 같으므로
 * UNIQUE(endpoint) 충돌 → 갱신하고 다시 활성화한다.
 */
export async function saveSubscription(schema: string, input: SaveSubscriptionInput): Promise<SubscriptionRow> {
  const rows = await prisma.$queryRawUnsafe<SubscriptionRow[]>(
    `INSERT INTO "${schema}".push_subscriptions
       (endpoint, p256dh, auth, user_agent, platform, member_id, is_active, last_error)
     VALUES ($1, $2, $3, $4, $5, $6::uuid, true, '')
     ON CONFLICT (endpoint) DO UPDATE
       SET p256dh = $2, auth = $3, user_agent = $4, platform = $5,
           member_id = COALESCE($6::uuid, "${schema}".push_subscriptions.member_id),
           is_active = true, last_error = '', updated_at = NOW()
     RETURNING id, endpoint, p256dh, auth, is_active`,
    input.endpoint, input.p256dh, input.auth,
    (input.userAgent ?? '').slice(0, 500), (input.platform ?? '').slice(0, 40),
    input.memberId ?? null,
  );
  return rows[0]!;
}

/** 성도가 알림을 끄거나 브라우저가 구독을 버렸을 때. */
export async function deactivateSubscription(schema: string, endpoint: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "${schema}".push_subscriptions SET is_active = false, updated_at = NOW() WHERE endpoint = $1`,
    endpoint,
  );
}

async function markResult(
  schema: string, id: string, ok: boolean, gone: boolean, message: string,
): Promise<void> {
  if (ok) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".push_subscriptions SET last_success_at = NOW(), last_error = '', updated_at = NOW() WHERE id = $1::uuid`,
      id,
    );
    return;
  }
  // 404/410 = 구독 영구 소멸 → 즉시 비활성화(요청서 §5-3).
  await prisma.$executeRawUnsafe(
    `UPDATE "${schema}".push_subscriptions
     SET is_active = CASE WHEN $2 THEN false ELSE is_active END,
         last_error = $3, updated_at = NOW()
     WHERE id = $1::uuid`,
    id, gone, message.slice(0, 200),
  );
}

export interface FanoutResult { sent: number; failed: number; deactivated: number }

/**
 * 한 테넌트의 활성 구독 전부에 같은 알림을 보낸다.
 * 실패해도 다른 구독 발송은 계속하고, 404/410 은 그 자리에서 꺼버린다.
 */
export async function sendToTenant(
  schema: string,
  payload: Record<string, unknown>,
  opts?: { endpoint?: string },
): Promise<FanoutResult> {
  const where = opts?.endpoint ? `AND endpoint = $1` : '';
  const args = opts?.endpoint ? [opts.endpoint] : [];
  const subs = await prisma.$queryRawUnsafe<SubscriptionRow[]>(
    `SELECT id, endpoint, p256dh, auth, is_active
     FROM "${schema}".push_subscriptions
     WHERE is_active = true ${where}`,
    ...args,
  );

  const out: FanoutResult = { sent: 0, failed: 0, deactivated: 0 };
  for (const s of subs) {
    const target: PushTarget = { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth };
    const r = await sendPush(target, payload);
    if (r.ok) {
      out.sent++;
      await markResult(schema, s.id, true, false, '');
    } else {
      out.failed++;
      if (r.gone) out.deactivated++;
      await markResult(schema, s.id, false, r.gone, r.message);
    }
  }
  return out;
}

export async function countTenantSubscriptions(schema: string): Promise<{ active: number; total: number }> {
  const rows = await prisma.$queryRawUnsafe<{ active: number; total: number }[]>(
    `SELECT count(*) FILTER (WHERE is_active)::int AS active, count(*)::int AS total
     FROM "${schema}".push_subscriptions`,
  );
  return rows[0] ?? { active: 0, total: 0 };
}
