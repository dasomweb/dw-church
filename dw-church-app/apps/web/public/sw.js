/* Minimal storefront service worker.
 * Goal: make tenant sites installable as a PWA without changing behavior.
 * Strategy: network-first; only cache navigations and fall back to the cache
 * (or a cached navigation) when offline. Never breaks the page. */

const CACHE = 'dw-church-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GETs; let everything else pass through untouched.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first. On success, cache navigations for offline fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (request.mode === 'navigate' && response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const fallback = await caches.match(request, { ignoreSearch: true });
          if (fallback) return fallback;
        }
        return Response.error();
      }),
  );
});

/* ── 웹 푸시 ──────────────────────────────────────────────────
 * iOS(16.4+)는 무음 푸시를 허용하지 않는다 — 모든 push 이벤트는 반드시
 * 알림을 띄워야 한다. 그래서 payload 가 깨졌거나 비어 있어도 기본 문구로
 * 하나는 표시한다(안 띄우면 브라우저가 구독을 해지해 버릴 수 있다).
 * payload 에는 개인정보를 넣지 않는다 — 제목/본문/이동 URL/태그 정도만. */

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    try { d = { body: event.data ? event.data.text() : '' }; } catch { d = {}; }
  }

  const title = d.title || 'TrueLight';
  const options = {
    body: d.body || '',
    icon: d.icon || '/icon-192.png',
    badge: d.badge || '/icon-192.png',
    // tag 가 같으면 이전 알림을 덮어써 같은 항목이 쌓이지 않는다.
    tag: d.tag || 'truelight',
    renotify: !!d.renotify,
    data: { url: d.url || '/' },
  };
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // 홈 화면 아이콘 배지(지원 기기만).
      if (typeof d.badgeCount === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
        return self.navigator.setAppBadge(d.badgeCount).catch(() => {});
      }
      return undefined;
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const url = new URL(target, self.location.origin).href;
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // 이미 열린 창이 있으면 그 창을 재사용한다(새 창을 계속 띄우지 않도록).
      for (const c of all) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          if ('navigate' in c) { try { await c.navigate(url); } catch { /* 권한 없으면 포커스만 */ } }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

/* 브라우저가 구독을 갱신하면(만료·키 변경 등) 서버에 새 구독을 다시 등록한다.
 * 이걸 빠뜨리면 조용히 발송이 끊긴다. 테넌트 식별은 SW 등록 시 쿼리로 받은
 * slug(self.registration.scope 기준으로는 알 수 없음)를 쓴다. */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const old = event.oldSubscription || (await self.registration.pushManager.getSubscription());
        const appKey = (event.newSubscription && event.newSubscription.options
          && event.newSubscription.options.applicationServerKey)
          || (old && old.options && old.options.applicationServerKey);
        const fresh = event.newSubscription
          || (await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey }));
        if (!fresh) return;
        const cfg = await readPushConfig();
        if (!cfg) return;
        await fetch(cfg.api + '/api/v1/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': cfg.slug },
          body: JSON.stringify({ ...fresh.toJSON(), platform: 'resubscribe' }),
        });
      } catch {
        /* 재등록 실패는 다음 접속 시 페이지 쪽에서 다시 시도한다 */
      }
    })(),
  );
});

/* 페이지가 구독할 때 심어준 설정(테넌트 slug + API 호스트)을 캐시에서 읽는다.
 * SW 는 localStorage 를 못 읽어서, 페이지가 Cache Storage 에 적어둔다. */
async function readPushConfig() {
  try {
    const cache = await caches.open(CACHE);
    const res = await cache.match('/__push-config');
    return res ? await res.json() : null;
  } catch {
    return null;
  }
}
