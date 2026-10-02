/**
 * True Light — Cloudflare Worker: SaaS Proxy
 *
 * Sits between Cloudflare-for-SaaS / wildcard subdomain traffic and
 * our Railway origin. Three jobs:
 *
 *   1. Rewrite upstream URL to customers.truelight.app so the TLS SNI
 *      on the origin connection becomes a host Railway has a cert for.
 *      Without this, tenant subdomains like lagrangechurch.truelight.app
 *      AND custom tenant domains like www.korusorchid.com would both
 *      hit Railway with an SNI Railway can't serve → Cloudflare 525.
 *
 *   2. Preserve the original hostname in X-Tenant-Host so the Next.js
 *      middleware can identify the tenant. X-Forwarded-Host doesn't
 *      work here — Cloudflare overwrites it with the routing
 *      destination when the outbound fetch re-enters the edge.
 *
 *   3. Stamp X-Tenant-Verify with the shared secret so the server
 *      only trusts X-Tenant-Host from us — not from a direct request
 *      to customers.truelight.app trying to spoof a tenant.
 *
 * Route is zone-level "*\/*" so Custom Hostname traffic — which would
 * otherwise bypass a hostname-restricted route — is captured.
 *
 * Bypass logic: ONLY the explicit platform hostnames (admin, api,
 * customers, saas-proxy, www, apex) pass through unchanged. Tenant
 * subdomains (anything else ending in .truelight.app) get proxied
 * because Railway only has SSL certs for the explicit platform
 * hostnames — not for arbitrary tenant subdomains.
 *
 * Configure SAAS_PROXY_SECRET via the Cloudflare dashboard
 * (Workers → Settings → Variables and Secrets → + Add, Type: Secret)
 * and add identical values to Railway api-server + web env.
 * FALLBACK_ORIGIN is a plaintext var in wrangler.toml.
 */

/** Explicit platform hosts that Railway has SSL certs for. Anything else
 *  ending in .truelight.app gets proxied through customers.truelight.app
 *  (Railway can't serve a cert for arbitrary tenant subdomains without
 *  a wildcard cert, which requires DNS-01 challenge — out of scope). */
const PLATFORM_HOSTS = new Set([
  'truelight.app',
  'www.truelight.app',
  'admin.truelight.app',
  'api.truelight.app',
  'customers.truelight.app',
  'saas-proxy.truelight.app',
]);

/** 플랫폼 자기 도메인(= 슈퍼어드민 진입구). 여기서는 관리자 콘솔을 리다이렉트 없이
 *  제자리에서 서빙한다 → `truelight.app/admin/login` (admin.truelight.app/admin/… 의
 *  'admin' 중복 제거). admin.truelight.app 도 계속 동작한다(기존 북마크/메일). */
const BARE_ENTRY_HOSTS = new Set(['truelight.app', 'www.truelight.app']);

/** 관리자 SPA + 그 인증 진입 경로 (테넌트 도메인/플랫폼 공통). */
function isAdminPath(p) {
  return (
    p === '/admin' || p.startsWith('/admin/') ||
    p === '/login' || p === '/forgot-password' || p === '/reset-password' || p === '/register'
  );
}

/** 플랫폼 도메인에서만 추가로 열어주는 슈퍼어드민 콘솔 경로. */
function isPlatformAdminPath(p) {
  return isAdminPath(p) || p === '/super-admin' || p.startsWith('/super-admin/');
}

/** admin 서비스로 프록시 (브라우저 주소는 원래 호스트 그대로 유지). */
function proxyToAdmin(request, incoming) {
  const adminUpstream = new URL(incoming.pathname + incoming.search, 'https://admin.truelight.app');
  const adminHeaders = new Headers(request.headers);
  adminHeaders.delete('cf-connecting-ip');
  adminHeaders.delete('cf-ipcountry');
  return fetch(new Request(adminUpstream.toString(), {
    method: request.method,
    headers: adminHeaders,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  }));
}

/**
 * 이 호스트가 실제로 존재하는 테넌트인가 — 관리자 경로를 열어주기 전 확인.
 * 없는 서브도메인(예: nosuchchurch.truelight.app)에서 /admin/login 이 로그인 창을
 * 띄우던 문제를 막는다(스토어프론트는 web 미들웨어가 이미 404 처리하는데, admin
 * 경로는 web 에 도달하지 않아 검증을 건너뛰었다).
 * 조회 실패(API 장애 등)는 **fail-open** — 전 테넌트 관리자를 막지 않는다.
 */
async function tenantExists(hostname, env) {
  const apiBase = env.API_BASE || 'https://api.truelight.app';
  const sub = hostname.match(/^([^.]+)\.truelight\.app$/);
  try {
    if (sub) {
      // ⚠ 캐시 금지: 테넌트는 URL 이 아니라 X-Tenant-Slug **헤더**로 구분된다.
      // cacheEverything/cacheTtl 을 쓰면 CF 캐시 키가 URL 만 보므로 한 테넌트의
      // 응답(특히 없는 테넌트의 404)이 다른 모든 테넌트에 재사용된다 — 실제로
      // 이 설정 때문에 전 테넌트 관리자 로그인이 404 로 깨졌다.
      const res = await fetch(`${apiBase}/api/v1/settings`, {
        headers: { 'X-Tenant-Slug': sub[1] },
        cf: { cacheTtl: 0 },
      });
      return res.ok;
    }
    const res = await fetch(
      `${apiBase}/api/v1/admin/tenants/resolve-domain?domain=${encodeURIComponent(hostname)}`,
      { cf: { cacheTtl: 60, cacheEverything: true } },
    );
    return res.ok;
  } catch {
    return true;
  }
}

export default {
  /**
   * @param {Request} request
   * @param {{ SAAS_PROXY_SECRET: string; FALLBACK_ORIGIN: string }} env
   */
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const fallbackOrigin = env.FALLBACK_ORIGIN || 'customers.truelight.app';

    // ── Migration egress proxy (added 2026-06-05) ──────────────
    // Many Korean church sites (SiteGround / Sucuri / Cloudflare-fronted
    // WordPress) block AWS / Railway IP ranges. Our api-server can't
    // fetch them directly. This endpoint lets api-server bounce its
    // outbound through Cloudflare's IPs (which are essentially never
    // blocked because they're the CDN-of-record for those very sites).
    //
    // Auth: X-Tenant-Verify header must equal SAAS_PROXY_SECRET — same
    // secret used for tenant-host trust. Without it the endpoint becomes
    // an open proxy (abuse vector); with it, only our api-server (which
    // shares the secret) can use it.
    //
    // Usage: GET https://api.truelight.app/__migration_proxy?url=<encoded>
    //        Headers: X-Tenant-Verify: <SAAS_PROXY_SECRET>
    // Response: pass-through of upstream status + body + content-type.
    if (incoming.pathname === '/__migration_proxy' && incoming.hostname === 'api.truelight.app') {
      if (request.headers.get('x-tenant-verify') !== env.SAAS_PROXY_SECRET) {
        return new Response('unauthorized', { status: 401 });
      }
      const targetUrl = incoming.searchParams.get('url');
      if (!targetUrl) return new Response('missing url param', { status: 400 });
      // UA fallback: sites split into two camps —
      //   (a) block bots/datacenter, allow real browsers (Cloudflare/Sucuri)
      //   (b) block generic browsers, allow Googlebot (verified live on
      //       lagrangechurch.org — WPMU DEV hosting returns a static 403 to
      //       every non-crawler UA, including residential IPs, but 200 to
      //       Googlebot since it does NOT reverse-DNS-verify the crawler).
      // Try the browser UA first; if the origin hard-blocks it (403/401/429),
      // retry as Googlebot. Whichever returns a non-block status wins.
      const UAS = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      ];
      try {
        // Success = HTTP 200 ONLY. Anti-bot layers return not just 403/401/429
        // but also 202 with an empty body (an async-challenge stub) from some
        // egress IPs — treating 202 as success returns an empty page and skips
        // the Googlebot fallback. So we retry on anything that is not a 200,
        // and keep the first 200 we get (else the last response we saw).
        let upstreamRes = null;
        let firstResp = null;
        let usedUa = '';
        for (const ua of UAS) {
          const resp = await fetch(targetUrl, {
            headers: {
              'User-Agent': ua,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8',
              'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            },
            redirect: 'follow',
          });
          if (!firstResp) firstResp = resp; // remember fallback to return
          if (resp.status === 200) { upstreamRes = resp; usedUa = ua; break; }
          usedUa = ua;
        }
        if (!upstreamRes) upstreamRes = firstResp; // no 200 from any UA
        const ct = upstreamRes.headers.get('content-type') || 'text/plain';
        return new Response(upstreamRes.body, {
          status: upstreamRes.status,
          headers: {
            'content-type': ct,
            'x-proxy-source': new URL(targetUrl).host,
            'x-proxy-upstream-status': String(upstreamRes.status),
            'x-proxy-ua': usedUa.includes('Googlebot') ? 'googlebot' : 'browser',
          },
        });
      } catch (err) {
        return new Response(`proxy error: ${String(err)}`, { status: 502 });
      }
    }

    // KILLSWITCH: DISABLE_ADMIN_PROXY=1 (wrangler var/secret) 로 관리자 경로
    // 가로채기만 끈다. 끄면 그 경로도 평소 흐름(스토어프론트 / 기존 리다이렉트)으로
    // 흘러가므로 교회 홈페이지는 계속 정상이다.
    const adminProxyDisabled = ['1', 'true', 'yes'].includes(
      String(env.DISABLE_ADMIN_PROXY ?? '').toLowerCase(),
    );
    const p = incoming.pathname;

    // Platform hosts pass through unchanged — Railway has certs for them.
    // Required also to prevent infinite loop on customers.truelight.app
    // (where the proxied outbound lands). This also means the admin service's
    // own host (admin.truelight.app) is reached directly by the admin-path
    // proxy below without re-entering this branch's tenant logic.
    //
    // 예외: truelight.app / www — 슈퍼어드민 콘솔을 **제자리에서** 서빙한다.
    // (기존엔 web 미들웨어가 admin.truelight.app 으로 307 리다이렉트해서
    //  `admin.truelight.app/admin/login` 처럼 'admin' 이 중복됐다.)
    // 마케팅 사이트 등 나머지 경로는 기존대로 그대로 통과시킨다.
    if (PLATFORM_HOSTS.has(incoming.hostname)) {
      if (BARE_ENTRY_HOSTS.has(incoming.hostname) && !adminProxyDisabled && isPlatformAdminPath(p)) {
        return proxyToAdmin(request, incoming);
      }
      return fetch(request);
    }

    // ── Tenant admin surface on the tenant's OWN domain ──────────
    // The tenant admin now lives at <tenant>/admin (same origin as the
    // storefront the members see) so tenants never touch admin.truelight.app.
    // The admin SPA (Vite base '/admin/') + its auth entry paths are served by
    // the ADMIN service, not the storefront (web). Proxy those paths to
    // admin.truelight.app (a platform host Railway has a cert for). The browser
    // URL stays on the tenant domain, so the SPA runs same-origin with the
    // storefront and detects "host mode" from window.location.
    //   - /admin, /admin/*        → the SPA + its hashed assets
    //   - /login, /forgot-password, /reset-password, /register
    //       → admin server 302s these to /admin/… (friendly tenant URLs)
    //
    // 단, **존재하는 테넌트일 때만** 열어준다. 없는 서브도메인은 관리자 경로를
    // 통과시키지 않고 아래 스토어프론트로 흘려보내 web 미들웨어가 404 를 내게 한다
    // (해시 에셋은 셸 진입 때 이미 검증됐으므로 매 청크마다 조회하지 않는다).
    if (isAdminPath(p) && !adminProxyDisabled) {
      const skipCheck = p.startsWith('/admin/assets/');
      if (skipCheck || (await tenantExists(incoming.hostname, env))) {
        return proxyToAdmin(request, incoming);
      }
      // 없는 테넌트 → fall through → 스토어프론트 404
    }

    // Everything else (tenant subdomains + custom tenant domains) →
    // proxy through customers.truelight.app. The outbound fetch's SNI
    // follows the URL host, so Railway sees SNI=customers.truelight.app
    // → cert matches → SSL handshake succeeds.
    const upstream = new URL(incoming.pathname + incoming.search, `https://${fallbackOrigin}`);

    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set('X-Tenant-Host', incoming.host);
    if (env.SAAS_PROXY_SECRET) {
      upstreamHeaders.set('X-Tenant-Verify', env.SAAS_PROXY_SECRET);
    }
    upstreamHeaders.delete('cf-connecting-ip');
    upstreamHeaders.delete('cf-ipcountry');

    const upstreamRequest = new Request(upstream.toString(), {
      method: request.method,
      headers: upstreamHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });

    return fetch(upstreamRequest);
  },
};
