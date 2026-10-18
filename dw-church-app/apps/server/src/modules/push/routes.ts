import type { FastifyInstance } from 'fastify';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { getPublicKey } from '../../config/web-push.js';
import {
  regenerateKeysSchema, updatePushSettingsSchema,
  saveSubscriptionSchema, unsubscribeSchema, testPushSchema, savePrefsSchema,
} from './schema.js';
import * as svc from './service.js';
import { PUSH_CATEGORIES, groupedCategories, isPushCategory } from './categories.js';

/**
 * 웹 푸시 라우트.
 *
 *   GET  /push/public-key        공개 — 브라우저가 구독할 때 필요한 VAPID 공개키
 *   POST /push/subscribe         공개 — 성도 기기 구독 저장(테넌트 스키마)
 *   POST /push/unsubscribe       공개 — 구독 해제
 *   GET  /admin/push-settings    슈퍼어드민 — 키 상태(개인키는 절대 안 돌려줌)
 *   POST /admin/push-settings/generate  슈퍼어드민 — 키쌍 생성/재생성
 *   PATCH /admin/push-settings   슈퍼어드민 — 연락처만 변경
 *   POST /push/test              교회 관리자 — 테스트 발송
 *
 * 구독 저장이 공개인 이유: 알림을 켜는 사람은 로그인한 교인이 아닐 수 있다
 * (성도용 PWA 는 간단 가입 전에도 설치·구독이 가능해야 한다 — 요청서 §3-1).
 * 대신 저장되는 건 그 기기의 endpoint 뿐이고, 테넌트 스키마로 격리된다.
 */
export async function pushRoutes(app: FastifyInstance) {
  // ── 공개: 구독에 필요한 공개키 ──────────────────────────────
  app.get('/push/public-key', async (_request, reply) => {
    const publicKey = await getPublicKey();
    // 미설정이어도 200 — 프런트가 "푸시 꺼짐"으로 조용히 처리하게 한다.
    return reply.send({ data: { publicKey, configured: !!publicKey } });
  });

  // ── 공개: 구독 저장 ─────────────────────────────────────────
  app.post('/push/subscribe', async (request, reply) => {
    const input = saveSubscriptionSchema.parse(request.body);
    const row = await svc.saveSubscription(getSchema(request), {
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? '',
      platform: input.platform,
      memberId: input.memberId ?? null,
    });
    return reply.status(201).send({ data: { id: row.id } });
  });

  // ── 공개: 구독 해제 ─────────────────────────────────────────
  app.post('/push/unsubscribe', async (request, reply) => {
    const { endpoint } = unsubscribeSchema.parse(request.body);
    await svc.deactivateSubscription(getSchema(request), endpoint);
    return reply.send({ data: { ok: true } });
  });

  // ── 공개: 알림 항목 목록(수신 설정 화면이 그릴 기준) ────────
  app.get('/push/categories', async (_request, reply) => {
    return reply.send({ data: { categories: PUSH_CATEGORIES, grouped: groupedCategories() } });
  });

  // ── 공개: 수신 설정 읽기/저장(구독=기기 기준) ────────
  // 로그인 전에도 알림을 켜고 항목을 고를 수 있어야 해서(요청서 §3-1)
  // member_id 가 아니라 endpoint 로 잡는다. endpoint 를 아는 건 그 기기뿐이다.
  app.get('/push/prefs', async (request, reply) => {
    const { endpoint } = request.query as { endpoint?: string };
    if (!endpoint) {
      return reply.status(400).send({ error: { code: 'ENDPOINT_REQUIRED', message: 'endpoint 가 필요합니다' } });
    }
    const data = await svc.getPrefs(getSchema(request), endpoint);
    return reply.send({ data });
  });

  app.put('/push/prefs', async (request, reply) => {
    const input = savePrefsSchema.parse(request.body);
    // 모르는 카테고리는 버린다 — 항목이 바뀔도 오래된 클라이언트가 400 을 맞지 않게.
    const prefs = input.prefs.filter((p) => isPushCategory(p.category));
    const data = await svc.savePrefs(getSchema(request), input.endpoint, prefs);
    return reply.send({ data });
  });

  // ── 교회 관리자: 구독 현황 + 테스트 발송 ─────────────────────
  app.get('/admin/push/stats', { preHandler: [requireAdmin] }, async (request, reply) => {
    const data = await svc.countTenantSubscriptions(getSchema(request));
    return reply.send({ data });
  });

  app.post('/push/test', { preHandler: [requireAdmin] }, async (request, reply) => {
    const input = testPushSchema.parse(request.body ?? {});
    const publicKey = await getPublicKey();
    if (!publicKey) {
      return reply.status(503).send({
        error: { code: 'PUSH_NOT_CONFIGURED', message: '푸시 키가 설정되지 않았습니다. 슈퍼어드민에게 문의하세요.' },
      });
    }
    const result = await svc.sendToTenant(
      getSchema(request),
      { title: input.title, body: input.body, url: input.url, tag: 'test' },
      input.endpoint ? { endpoint: input.endpoint } : undefined,
    );
    return reply.send({ data: result });
  });

  // ── 슈퍼어드민: VAPID 키 ────────────────────────────────────
  app.get('/admin/push-settings', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    const row = await svc.getPushSettings();
    const activeSubscriptions = await svc.countActiveSubscriptions();
    // 개인키는 절대 내보내지 않는다 — 설정 여부만(email-settings 와 같은 규칙).
    return reply.send({
      data: {
        publicKey: row?.public_key ?? '',
        privateKeySet: !!(row?.private_key && row.private_key.length > 0),
        subject: row?.subject ?? '',
        updatedAt: row?.updated_at ?? null,
        activeSubscriptions,
      },
    });
  });

  app.post('/admin/push-settings/generate', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = regenerateKeysSchema.parse(request.body ?? {});
    const current = await svc.getPushSettings();
    const hasKey = !!(current?.private_key && current.private_key.length > 0);
    const activeSubscriptions = await svc.countActiveSubscriptions();

    // 이미 키가 있고 살아있는 구독이 있으면, 확인 없이는 재생성하지 않는다.
    // 키를 바꾸면 그 구독들이 전부 무효가 되어 성도 전원이 다시 켜야 한다(RFC 8292 §4.2).
    // 에러가 아니라 **2단계 플로우**라 200 + requiresConfirm 으로 돌려준다
    // (클라이언트가 에러 메시지 문자열을 파싱하지 않아도 되게).
    if (hasKey && activeSubscriptions > 0 && !input.confirmInvalidate) {
      return reply.send({
        data: {
          requiresConfirm: true,
          activeSubscriptions,
          message: `재생성하면 기존 구독 ${activeSubscriptions}건이 모두 무효가 되어 성도들이 알림을 다시 켜야 합니다.`,
        },
      });
    }

    const row = await svc.regenerateKeys(input.subject || current?.subject || '');
    return reply.send({
      data: {
        publicKey: row.public_key,
        privateKeySet: true,
        subject: row.subject,
        updatedAt: row.updated_at,
        requiresConfirm: false,
        invalidatedSubscriptions: hasKey ? activeSubscriptions : 0,
      },
    });
  });

  app.patch('/admin/push-settings', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { subject } = updatePushSettingsSchema.parse(request.body ?? {});
    const row = await svc.updateSubject(subject);
    return reply.send({
      data: { publicKey: row.public_key, privateKeySet: !!row.private_key, subject: row.subject, updatedAt: row.updated_at },
    });
  });
}
