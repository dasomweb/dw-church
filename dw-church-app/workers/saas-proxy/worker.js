/**
 * True Light — Cloudflare Worker: SaaS Proxy
 *
 * Ported from b2bsmart 2026-06-03. See:
 *   docs/multitenant-domains/01-architecture.md (origin pattern)
 *
 * Sits between Cloudflare-for-SaaS (which holds per-tenant SSL cert)
 * and our Railway origin. Three jobs:
 *
 *   1. Rewrite the upstream URL to customers.truelight.app so the TLS
 *      SNI on the origin connection becomes a host Railway recognises
 *      (instead of the tenant hostname, which Railway would 404 with
 *      "train not arrived").
 *   2. Preserve the original tenant hostname in X-Tenant-Host so the
 *      Next.js middleware can identify the tenant. (X-Forwarded-Host
 *      would work in theory but Cloudflare overwrites it with the
 *      routing destination when our outbound fetch re-enters the edge.)
 *   3. Stamp X-Tenant-Verify with the shared secret so the server
 *      only trusts X-Tenant-Host from us — not from a direct request
 *      to customers.truelight.app trying to spoof a tenant.
 *
 * Route is zone-level wildcard ("*\/*") so Custom Hostname traffic —
 * which would otherwise bypass a hostname-restricted route — is
 * captured. Self-hostnames (*.truelight.app) pass straight through
 * to avoid a redirect loop on customers.truelight.app and to leave
 * the marketing site / API / admin untouched.
 *
 * Configure SAAS_PROXY_SECRET via the Cloudflare dashboard
 * (Workers → Settings → Variables and Secrets → + Add, Type: Secret)
 * and add an identical value to Railway api-server + web env.
 * FALLBACK_ORIGIN is a plaintext var in wrangler.toml.
 */
export default {
  /**
   * @param {Request} request
   * @param {{ SAAS_PROXY_SECRET: string; FALLBACK_ORIGIN: string }} env
   */
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const fallbackOrigin = env.FALLBACK_ORIGIN || 'customers.truelight.app';

    // Self-hostnames pass through unchanged. Required because our route
    // is "*/*" (zone-level) — without this we'd recurse on
    // customers.truelight.app and break the admin / api / web.
    if (incoming.hostname === 'truelight.app' || incoming.hostname.endsWith('.truelight.app')) {
      return fetch(request);
    }

    // Upstream URL on fallback origin — SNI follows the URL host.
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
