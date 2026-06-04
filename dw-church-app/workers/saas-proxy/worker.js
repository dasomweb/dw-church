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
