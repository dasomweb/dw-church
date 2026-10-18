'use client';

import { useCallback, useEffect, useState } from 'react';
import { SectionShell } from '../utilities/SectionShell';
import { getServiceWorkerRegistration } from '../utilities/sw-ready';

/**
 * push_subscribe — "알림 받기" 블록.
 *
 * 운영자가 아무 페이지에나 놓을 수 있는 범용 블록이다. 한 교회 전용이 아니라
 * 토큰·props 로만 움직인다.
 *
 * 권한은 **버튼을 누를 때만** 요청한다. 페이지 로드 즉시 물으면 대부분 거부하고,
 * 한 번 거부하면 브라우저가 다시 묻지 않아 그 기기는 영영 알림을 못 받는다.
 *
 * iOS 는 16.4+ 이면서 **홈 화면에 설치해 실행한 상태(standalone)** 에서만 웹 푸시가
 * 동작한다. 사파리 탭에서는 버튼 대신 설치 방법을 안내한다.
 */

const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'https://api.truelight.app';
const SW_CACHE = 'dw-church-v1'; // sw.js 와 같은 캐시 이름

type State =
  | 'checking'
  | 'unsupported'     // 이 브라우저는 푸시 자체가 없음 → 블록을 숨긴다
  | 'needs-install'   // iOS 사파리 탭 — 홈 화면에 추가해야 함
  | 'not-configured'  // 플랫폼에 VAPID 키 없음 → 블록을 숨긴다
  | 'ready'
  | 'subscribed'
  | 'denied'
  | 'working';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    // iPadOS 13+ 는 UA 가 Mac 으로 보이므로 터치 지원으로 가른다.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true;
}

/** base64url VAPID 공개키 → Uint8Array (pushManager.subscribe 요구 형식) */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface PushSubscribeBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

export function PushSubscribeBlock({ props, slug = '' }: PushSubscribeBlockProps) {
  const p = (props ?? {}) as Record<string, unknown>;
  const title = String(p.title ?? '');
  const description = String(p.description ?? '');
  const buttonLabel = String(p.buttonLabel ?? '매일 말씀 알림 받기');
  const subscribedLabel = String(p.subscribedLabel ?? '알림 받는 중 · 끄기');
  const iosGuide = String(p.iosGuide ?? '아이폰은 공유 버튼 → "홈 화면에 추가" 후, 홈 화면 아이콘으로 열면 알림을 받을 수 있습니다.');

  const [state, setState] = useState<State>('checking');
  const [message, setMessage] = useState('');

  const TEXT = 'var(--dw-text, #3a3129)';
  const MUTED = 'var(--brand-muted, #6f6255)';
  const PRIMARY = 'var(--dw-primary, #7b7d5c)';

  useEffect(() => {
    let alive = true;
    (async () => {
      if (typeof window === 'undefined') return;
      // 페이지 에디터 미리보기(iframe) 안에서는 실제 구독을 건드리지 않는다.
      if (window.self !== window.top) { setState('ready'); return; }

      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!supported) {
        // iOS 는 설치 전에는 PushManager 가 아예 없다 — "미지원"이 아니라 설치 안내가 맞다.
        if (alive) setState(isIos() && !isStandalone() ? 'needs-install' : 'unsupported');
        return;
      }
      if (isIos() && !isStandalone()) { if (alive) setState('needs-install'); return; }

      // 플랫폼에 키가 없으면 블록 자체를 숨긴다(눌러봤자 실패).
      try {
        const res = await fetch(`${API_BASE}/api/v1/push/public-key`, { cache: 'no-store' });
        const json = await res.json() as { data?: { configured?: boolean } };
        if (!json?.data?.configured) { if (alive) setState('not-configured'); return; }
      } catch {
        if (alive) setState('not-configured');
        return;
      }

      if (Notification.permission === 'denied') { if (alive) setState('denied'); return; }
      // SW 가 없으면 구독을 만들 수 없다. ready 를 그냥 기다리면 영영 안 끝나므로
      // 시간 제한을 둔 헬퍼를 쓰고, 없으면 섹션을 숨긴다(눌러도 안 되는 버튼 방지).
      const reg = await getServiceWorkerRegistration();
      if (!reg) { if (alive) setState('not-configured'); return; }
      const existing = await reg.pushManager.getSubscription().catch(() => null);
      if (alive) setState(existing ? 'subscribed' : 'ready');
    })();
    return () => { alive = false; };
  }, []);

  const subscribe = useCallback(async () => {
    setState('working');
    setMessage('');
    try {
      const keyRes = await fetch(`${API_BASE}/api/v1/push/public-key`, { cache: 'no-store' });
      const { data } = await keyRes.json() as { data: { publicKey: string | null } };
      if (!data?.publicKey) throw new Error('알림 설정이 아직 준비되지 않았습니다.');

      // ⚠ 반드시 클릭 핸들러 안에서 호출해야 한다(사용자 제스처 요구).
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'ready');
        return;
      }

      const reg = await getServiceWorkerRegistration();
      if (!reg) throw new Error('이 브라우저에서는 알림을 사용할 수 없습니다.');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true, // iOS 는 무음 푸시 금지 — 항상 true
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      });

      const res = await fetch(`${API_BASE}/api/v1/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
        body: JSON.stringify({ ...sub.toJSON(), platform: isIos() ? 'ios' : 'web' }),
      });
      if (!res.ok) throw new Error('알림 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');

      // SW 가 pushsubscriptionchange 때 재등록하려면 테넌트/API 를 알아야 하는데
      // SW 는 localStorage 를 못 읽는다 → Cache Storage 에 적어둔다.
      try {
        const cache = await caches.open(SW_CACHE);
        await cache.put('/__push-config', new Response(JSON.stringify({ slug, api: API_BASE }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      } catch { /* 캐시 실패해도 구독 자체는 유효 */ }

      setState('subscribed');
    } catch (err) {
      setState('ready');
      setMessage(err instanceof Error ? err.message : '알림을 켜지 못했습니다.');
    }
  }, [slug]);

  const unsubscribe = useCallback(async () => {
    setState('working');
    try {
      const reg = await getServiceWorkerRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch(`${API_BASE}/api/v1/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setState('ready');
    } catch {
      setState('subscribed');
    }
  }, [slug]);

  // 켤 방법이 없는 환경에서는 섹션을 통째로 숨긴다 — 눌러도 안 되는 버튼을 두지 않는다.
  if (state === 'checking' || state === 'unsupported' || state === 'not-configured') return null;

  const btn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '13px 26px', borderRadius: 2, fontSize: 15, fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer', border: 0,
  } as const;

  return (
    <SectionShell
      props={props}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
      style={{ paddingBlock: 'var(--section-py-md)' }}
    >
      <div style={{ maxWidth: '34em' }}>
        {title && (
          <h2 style={{
            fontFamily: 'var(--dw-font-heading, var(--brand-font-heading, serif))',
            margin: 0, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 600, color: TEXT,
          }}>{title}</h2>
        )}
        {description && (
          <p style={{ margin: title ? '12px 0 0' : 0, fontSize: 16, lineHeight: 1.75, color: MUTED }}>
            {description}
          </p>
        )}

        <div style={{ marginTop: title || description ? 20 : 0 }}>
          {state === 'needs-install' && (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: MUTED }}>{iosGuide}</p>
          )}

          {state === 'denied' && (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: MUTED }}>
              알림이 차단되어 있습니다. 기기 설정 → 알림에서 이 앱의 알림을 켜주세요.
            </p>
          )}

          {state === 'subscribed' && (
            <button type="button" onClick={unsubscribe}
              style={{ ...btn, background: 'transparent', color: MUTED, border: '1px solid var(--border, #e2d8cb)' }}>
              {subscribedLabel}
            </button>
          )}

          {(state === 'ready' || state === 'working') && (
            <>
              <button type="button" onClick={subscribe} disabled={state === 'working'}
                style={{ ...btn, background: PRIMARY, color: '#fff', opacity: state === 'working' ? 0.6 : 1 }}>
                {state === 'working' ? '설정 중...' : buttonLabel}
              </button>
              {message && (
                <p style={{ margin: '12px 0 0', fontSize: 14, color: PRIMARY }}>{message}</p>
              )}
            </>
          )}
        </div>
      </div>
    </SectionShell>
  );
}
