import { env } from './env.js';

/**
 * Cloudflare for SaaS — Custom Hostnames API client.
 * Ported from b2bsmart (2026-06-03). See docs/multitenant-domains/.
 *
 * Each tenant's custom domain is registered as a "custom hostname" under
 * the truelight.app zone. Cloudflare issues the TLS cert, terminates SSL
 * at the edge, and proxies traffic to our Fallback Origin
 * (saas-proxy.truelight.app → Worker → customers.truelight.app → Railway).
 *
 * Replaces the prior Railway customDomainCreate flow which doesn't scale
 * past a few hundred tenants.
 *
 * Without env vars (CF_API_TOKEN / CF_ZONE_ID) the client is a no-op and
 * the caller (domains/service.ts) surfaces a "not configured" diagnostic
 * to the operator. We never silently fall back to the old Railway path.
 */

const CF_API = 'https://api.cloudflare.com/client/v4';

export interface CloudflareOwnershipVerification {
  type: 'txt' | 'http';
  name: string;
  value: string;
}

export interface CloudflareVerificationError {
  message: string;
}

export interface CloudflareCustomHostname {
  id: string;
  hostname: string;
  /** Routing status (CNAME validation / ownership). Cloudflare adds states
   *  over time; we store the raw string for forward compat. The SSL cert
   *  status lives separately under ssl.status — conflating the two
   *  reported HTTPS-ready before the cert was actually issued. */
  status: string;
  ssl?: {
    status?: string;
    method?: string;
    type?: string;
  };
  ownership_verification?: CloudflareOwnershipVerification | null;
  ownership_verification_http?: CloudflareOwnershipVerification | null;
  verification_errors?: string[];
}

function isConfigured(): boolean {
  return !!(env.CF_API_TOKEN && env.CF_ZONE_ID);
}

interface CloudflareEnvelope<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
}

async function cfRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json() as CloudflareEnvelope<T>;
  if (!res.ok || !body.success) {
    const msg = body.errors?.map((e) => `${e.code}: ${e.message}`).join('; ') ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare API ${path}: ${msg}`);
  }
  return body.result;
}

/**
 * Create a custom hostname on our zone. Cloudflare responds with the
 * hostname id (we store it on custom_domains) and the ownership_verification
 * record the tenant must add at their DNS. The hostname starts in
 * 'pending_validation' until those records propagate; subsequent
 * getCustomHostname calls give us the live status.
 *
 * SSL: ssl.method='http' uses ACME HTTP-01 via the CNAME chain — once
 * the operator's CNAME for <hostname> resolves to
 * customers.truelight.app (proxied through our Cloudflare zone),
 * Cloudflare's edge serves the ACME challenge automatically.
 * Operator needs ZERO extra DNS records for the cert itself.
 *
 * NOTE: custom_origin_sni is gated behind paid SSL for SaaS / Enterprise.
 * On Free, the truelight.app zone SSL mode must be "Full" (not
 * "Full strict"), so the origin-side SNI mismatch (SNI=customer
 * hostname vs Railway cert=customers.truelight.app) is accepted while
 * the origin connection stays HTTPS-encrypted.
 */
export async function createCustomHostname(hostname: string): Promise<CloudflareCustomHostname | null> {
  if (!isConfigured()) return null;
  return cfRequest<CloudflareCustomHostname>(
    `/zones/${env.CF_ZONE_ID}/custom_hostnames`,
    {
      method: 'POST',
      body: JSON.stringify({
        hostname,
        ssl: {
          method: 'http',
          type: 'dv',
          settings: { min_tls_version: '1.2' },
        },
      }),
    },
  );
}

/** Fetch the current state of a previously-created custom hostname. */
export async function getCustomHostname(id: string): Promise<CloudflareCustomHostname | null> {
  if (!isConfigured() || !id) return null;
  return cfRequest<CloudflareCustomHostname>(
    `/zones/${env.CF_ZONE_ID}/custom_hostnames/${id}`,
  );
}

/**
 * Look up a custom hostname by its name. Used to recover from Cloudflare's
 * 1406 "Duplicate custom hostname" — the hostname already exists on the zone
 * (e.g. an orphan from a prior attempt), so we fetch the existing record and
 * reuse its id + ownership_verification instead of failing the add.
 */
export async function getCustomHostnameByName(hostname: string): Promise<CloudflareCustomHostname | null> {
  if (!isConfigured() || !hostname) return null;
  const list = await cfRequest<CloudflareCustomHostname[]>(
    `/zones/${env.CF_ZONE_ID}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
  );
  return list.find((h) => h.hostname === hostname) ?? list[0] ?? null;
}

/** Remove a hostname when the tenant disconnects their domain. */
export async function deleteCustomHostname(id: string): Promise<void> {
  if (!isConfigured() || !id) return;
  await cfRequest<unknown>(
    `/zones/${env.CF_ZONE_ID}/custom_hostnames/${id}`,
    { method: 'DELETE' },
  );
}

export const cloudflareConfigured = isConfigured;

/**
 * Per-variable presence flags for the super-admin diagnostics panel.
 * Returns booleans only (never the token) plus the public fallback origin
 * — which tenants need to know anyway when connecting their domain.
 */
export function cloudflareConfigStatus(): {
  hasApiToken: boolean;
  hasZoneId: boolean;
  configured: boolean;
  fallbackOrigin: string;
} {
  return {
    hasApiToken: !!env.CF_API_TOKEN,
    hasZoneId: !!env.CF_ZONE_ID,
    configured: isConfigured(),
    fallbackOrigin: env.CF_FALLBACK_ORIGIN,
  };
}

/**
 * Live reachability probe — fetches the configured zone so the
 * diagnostics panel can confirm the API token AND zone id actually
 * work together (not just "the string is non-empty"). A wrong/expired
 * token or bad zone id surfaces here instead of silently failing the
 * first time a tenant tries to connect a domain.
 */
export async function pingCloudflare(): Promise<{
  ok: boolean;
  error?: string;
  zoneName?: string;
}> {
  if (!isConfigured()) {
    return { ok: false, error: 'Cloudflare 환경변수가 설정되지 않았습니다.' };
  }
  try {
    const zone = await cfRequest<{ name: string }>(`/zones/${env.CF_ZONE_ID}`);
    return { ok: true, zoneName: zone.name };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
