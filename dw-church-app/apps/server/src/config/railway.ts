import { env } from './env.js';

/**
 * Thin wrapper around Railway's public GraphQL API.
 * Used to auto-register verified custom domains on the web service —
 * Railway's edge then handles Let's Encrypt SSL + hostname routing.
 *
 * Without these env vars, the Railway integration is a no-op and the
 * caller is responsible for adding the domain manually in the dashboard.
 */

const RAILWAY_GRAPHQL = 'https://backboard.railway.app/graphql/v2';

export interface RailwayCustomDomain {
  id: string;
  domain: string;
  status: string | null;
}

function isConfigured(): boolean {
  return !!(env.RAILWAY_API_TOKEN && env.RAILWAY_WEB_SERVICE_ID && env.RAILWAY_ENVIRONMENT_ID);
}

async function gqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(RAILWAY_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RAILWAY_API_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Railway API ${res.status}: ${body}`);
  }
  const json = await res.json() as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Railway API: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data) throw new Error('Railway API returned no data');
  return json.data;
}

/**
 * Add a custom domain to the configured web service. Idempotent-ish: if
 * Railway returns "already exists", we treat it as success.
 *
 * Returns the Railway domain record (id, domain, current status) so the
 * caller can store the Railway-side id for later SSL polling/removal.
 */
export async function addCustomDomain(domain: string): Promise<RailwayCustomDomain | null> {
  if (!isConfigured()) return null;

  const mutation = `
    mutation CustomDomainCreate($input: CustomDomainCreateInput!) {
      customDomainCreate(input: $input) {
        id
        domain
        status { dnsRecords { hostlabel requiredValue currentValue status } }
      }
    }
  `;
  try {
    const data = await gqlRequest<{
      customDomainCreate: {
        id: string;
        domain: string;
        status?: { dnsRecords?: Array<{ status?: string }> };
      };
    }>(mutation, {
      input: {
        domain,
        environmentId: env.RAILWAY_ENVIRONMENT_ID,
        serviceId: env.RAILWAY_WEB_SERVICE_ID,
      },
    });
    const created = data.customDomainCreate;
    // If every DNS record check passes, Railway reports a clean status
    const allOk = created.status?.dnsRecords?.every((r) => r.status === 'PROPAGATED' || r.status === 'OK');
    return { id: created.id, domain: created.domain, status: allOk ? 'active' : 'pending_ssl' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Railway returns an error when the same domain is added twice — that's
    // fine for our flow, just look it up again.
    if (/already exists|already (in use|registered)/i.test(msg)) {
      return { id: '', domain, status: 'pending_ssl' };
    }
    throw err;
  }
}

/**
 * Remove a custom domain from the web service. Used when a tenant deletes
 * their domain so it doesn't keep occupying a Railway slot / DNS record.
 */
export async function removeCustomDomain(railwayDomainId: string): Promise<void> {
  if (!isConfigured() || !railwayDomainId) return;

  const mutation = `
    mutation CustomDomainDelete($id: String!) {
      customDomainDelete(id: $id)
    }
  `;
  try {
    await gqlRequest(mutation, { id: railwayDomainId });
  } catch (err) {
    // Best-effort — log and continue; manual cleanup is acceptable
    console.warn(`Railway customDomainDelete failed for ${railwayDomainId}:`, err);
  }
}

/**
 * Lookup current SSL/propagation state for a previously-added domain.
 * Used by the "재확인" button so the user sees Railway's view of their DNS.
 */
export async function getCustomDomainStatus(railwayDomainId: string): Promise<RailwayCustomDomain | null> {
  if (!isConfigured() || !railwayDomainId) return null;
  const query = `
    query CustomDomain($id: String!) {
      customDomain(id: $id) {
        id
        domain
        status { dnsRecords { status } }
      }
    }
  `;
  try {
    const data = await gqlRequest<{
      customDomain: {
        id: string;
        domain: string;
        status?: { dnsRecords?: Array<{ status?: string }> };
      };
    }>(query, { id: railwayDomainId });
    const allOk = data.customDomain.status?.dnsRecords?.every((r) => r.status === 'PROPAGATED' || r.status === 'OK');
    return { id: data.customDomain.id, domain: data.customDomain.domain, status: allOk ? 'active' : 'pending_ssl' };
  } catch {
    return null;
  }
}

export const railwayConfigured = isConfigured;
