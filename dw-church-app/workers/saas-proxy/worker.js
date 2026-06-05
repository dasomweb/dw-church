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
      const BLOCK_STATUSES = new Set([401, 403, 429]);
      try {
        let upstreamRes = null;
        let usedUa = '';
        for (const ua of UAS) {
          usedUa = ua;
          upstreamRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': ua,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8',
              'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            },
            redirect: 'follow',
          });
          if (!BLOCK_STATUSES.has(upstreamRes.status)) break; // success → stop
        }
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

    // Platform hosts pass through unchanged — Railway has certs for them.
    // Required also to prevent infinite loop on customers.truelight.app
    // (where the proxied outbound lands).
    if (PLATFORM_HOSTS.has(incoming.hostname)) {
      return fetch(request);
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
