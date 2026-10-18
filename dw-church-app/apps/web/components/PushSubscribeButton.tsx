'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * 알림 받기 버튼 — 성도가 **직접 누를 때만** 권한을 요청한다.
 *
 * 페이지 로드 즉시 권한을 물으면 대부분 거부하고, 한 번 거부하면 브라우저가
 * 다시 묻지 않는다(요청서 §3-2). 그래서 이 버튼의 클릭 핸들러 안에서만
 * Notification.requestPermission() 을 호출한다.
 *
 * iOS 는 16.4+ 이고 **홈 화면에 설치해서 실행한 상태(standalone)** 에서만
 * 웹 푸시가 동작한다. 사파리 탭에서는 버튼 대신 설치 안내를 보여준다.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';
const CACHE = 'dw-church-v1'; // sw.js 와 같은 캐시 이름

type State =
  | 'checking'      // 지원 여부 확인 중
  | 'unsupported'   // 이 브라우저는 푸시 불가
  | 'needs-install' // iOS 사파리 탭 — 홈 화면에 추가해야 함
  | 'not-configured'// 플랫폼에 VAPID 키가 없음 → 버튼 자체를 숨김
  | 'ready'         // 구독 가능
  | 'subscribed'
  | 'denied'        // 사용자가 거부함
  | 'working';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    // iPadOS 13+ 는 UA 가 Mac 으로 보여서 터치 지원으로 가른다.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true;
}

/** base64url VAPID 공개키 → Uint8Array (pushManager.subscribe 가 요구하는 형식) */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface PushSubscribeButtonProps {
  slug: string;
  label?: string;
  className?: string;
}

export default function PushSubscribeButton({
  slug,
  label = '매일 말씀 알림 받기',
  className = '',
}: PushSubscribeButtonProps) {
  const [state, setState] = useState<State>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (typeof window === 'undefined') return;
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!supported) {
        // iOS 는 설치 전에는 PushManager 자체가 없다 — "미지원"이 아니라 설치 안내가 맞다.
        if (!alive) return;
        setState(isIos() && !isStandalone() ? 'needs-install' : 'unsupported');
        return;
      }
      if (isIos() && !isStandalone()) { if (alive) setState('needs-install'); return; }

      // 플랫폼에 키가 없으면 버튼을 아예 숨긴다(설정 전 교회에서 눌러봤자 실패).
      try {
        const res = await fetch(`${API_BASE}/api/v1/push/public-key`, { cache: 'no-store' });
        const json = await res.json() as { data?: { configured?: boolean } };
        if (!json?.data?.configured) { if (alive) setState('not-configured'); return; }
      } catch {
        if (alive) setState('not-configured');
        return;
      }

      if (Notification.permission === 'denied') { if (alive) setState('denied'); return; }
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const existing = reg ? await reg.pushManager.getSubscription() : null;
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
      if (!data?.publicKey) throw new Error('푸시 설정이 준비되지 않았습니다.');

      // ⚠ 반드시 클릭 핸들러 안에서 호출해야 한다(사용자 제스처 요구).
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'ready');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true, // iOS 는 무음 푸시 금지 — 항상 true
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      });

      const res = await fetch(`${API_BASE}/api/v1/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
        body: JSON.stringify({ ...sub.toJSON(), platform: isIos() ? 'ios' : 'web' }),
      });
      if (!res.ok) throw new Error('구독 저장에 실패했습니다.');

      // SW 가 pushsubscriptionchange 때 재등록할 수 있도록 테넌트/API 를 캐시에 적어둔다
      // (SW 는 localStorage 를 못 읽는다).
      try {
        const cache = await caches.open(CACHE);
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
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
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

  // 설정 안 된 플랫폼/미지원 브라우저에서는 아무것도 그리지 않는다.
  if (state === 'checking' || state === 'not-configured' || state === 'unsupported') return null;

  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors';

  if (state === 'needs-install') {
    return (
      <p className={`text-sm ${className}`} style={{ color: 'var(--brand-muted, #6f6255)' }}>
        아이폰에서는 <b>공유 → 홈 화면에 추가</b> 후 앱으로 열면 알림을 받을 수 있습니다.
      </p>
    );
  }

  if (state === 'denied') {
    return (
      <p className={`text-sm ${className}`} style={{ color: 'var(--brand-muted, #6f6255)' }}>
        알림이 차단되어 있습니다. 기기 설정 → 알림에서 이 앱의 알림을 켜주세요.
      </p>
    );
  }

  if (state === 'subscribed') {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={unsubscribe}
          className={`${base} border`}
          style={{ borderColor: 'var(--border, #e2d8cb)', color: 'var(--brand-muted, #6f6255)' }}
        >
          알림 받는 중 · 끄기
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={subscribe}
        disabled={state === 'working'}
        className={`${base} disabled:opacity-60`}
        style={{ background: 'var(--dw-primary, #7b7d5c)', color: '#fff' }}
      >
        {state === 'working' ? '설정 중...' : label}
      </button>
      {message && (
        <p className="mt-2 text-xs" style={{ color: 'var(--dw-primary, #7b7d5c)' }}>{message}</p>
      )}
    </div>
  );
}
