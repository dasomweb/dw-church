import webpush from 'web-push';
import { prisma } from './database.js';
import { env } from './env.js';

/**
 * 웹 푸시(VAPID) 설정.
 *
 * VAPID 는 **보내는 서버(= 플랫폼)의 신원**이지 교회별 계정이 아니다
 * (RFC 8292 §4: "The public key of the application server serves as a stable
 * identifier for the server"). 그래서 키는 테넌트가 아니라 public 에 한 벌만 둔다.
 *
 * 저장 위치는 email_settings 와 같은 방식 — 슈퍼어드민이 화면에서 관리하는
 * public 싱글톤 테이블. 환경변수는 **폴백**으로만 읽는다(DB 사고 시 복구 경로).
 *
 * ⚠️ 키 교체는 사실상 불가에 가깝다. RFC 8292 §4.2 — 구독 생성 시 쓴 공개키와
 * 같은 키로 서명해야 발송이 받아들여지므로, 키를 바꾸면 **기존 구독이 전부 무효**가
 * 되고 성도 전원이 다시 알림을 켜야 한다. 재생성 UI 는 그 사실을 알리고 막는다.
 */

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

let cached: VapidConfig | null = null;

/** 설정을 다시 읽도록 캐시를 버린다(키 저장 직후 호출). */
export function invalidatePushCache(): void {
  cached = null;
}

/** mailto: 또는 https: 여야 한다(RFC 8292 sub 클레임). 비면 기본 연락처. */
export function normalizeSubject(raw: string): string {
  const v = (raw || '').trim();
  if (/^(mailto:|https:\/\/)/i.test(v)) return v;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return `mailto:${v}`;
  return 'mailto:support@truelight.app';
}

/** DB 우선, 없으면 환경변수. 둘 다 없으면 null(= 푸시 미설정). */
export async function getVapidConfig(): Promise<VapidConfig | null> {
  if (cached) return cached;
  let row: { public_key?: string; private_key?: string; subject?: string } | undefined;
  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
      `SELECT public_key, private_key, subject FROM public.push_settings WHERE id = 1`,
    );
    row = rows[0];
  } catch {
    // 테이블이 아직 없을 수 있다(첫 배포 직전) — 환경변수로 폴백.
  }
  const publicKey = (row?.public_key || env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (row?.private_key || env.VAPID_PRIVATE_KEY || '').trim();
  if (!publicKey || !privateKey) return null;
  cached = {
    publicKey,
    privateKey,
    subject: normalizeSubject(row?.subject || env.VAPID_SUBJECT || ''),
  };
  return cached;
}

/** 설정 여부만 — 공개 엔드포인트가 쓰기 좋게 공개키만 돌려준다. */
export async function getPublicKey(): Promise<string | null> {
  const cfg = await getVapidConfig();
  return cfg?.publicKey ?? null;
}

/** 새 VAPID 키쌍 생성(저장은 호출자 몫). */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushSendResult =
  | { ok: true; statusCode: number }
  /** gone=true 면 구독이 영구 소멸(404/410) — 즉시 비활성화해야 한다. */
  | { ok: false; statusCode: number; gone: boolean; message: string };

/**
 * 한 구독에 알림 1건 발송.
 *
 * payload 에는 **개인정보를 넣지 않는다** — 제목/본문/아이콘/이동 URL 정도만.
 * (요청서 §5-3) iOS 는 무음 푸시를 허용하지 않으므로 수신 측 SW 가 반드시
 * 알림을 표시해야 한다.
 */
export async function sendPush(
  target: PushTarget,
  payload: Record<string, unknown>,
): Promise<PushSendResult> {
  const cfg = await getVapidConfig();
  if (!cfg) {
    return { ok: false, statusCode: 0, gone: false, message: 'VAPID 키가 설정되지 않았습니다' };
  }
  try {
    const res = await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
      {
        vapidDetails: {
          subject: cfg.subject,
          publicKey: cfg.publicKey,
          privateKey: cfg.privateKey,
        },
        TTL: 60 * 60 * 12, // 12시간 — 지난 알림을 뒤늦게 띄우지 않는다
      },
    );
    return { ok: true, statusCode: res.statusCode };
  } catch (err) {
    const e = (err ?? {}) as { statusCode?: number; body?: string; message?: string };
    const statusCode = Number(e.statusCode ?? 0);
    // 404 Not Found / 410 Gone = 구독이 사라짐. 재시도하면 안 되고 꺼야 한다.
    const gone = statusCode === 404 || statusCode === 410;
    return {
      ok: false,
      statusCode,
      gone,
      message: String(e.body || e.message || err).slice(0, 200),
    };
  }
}
