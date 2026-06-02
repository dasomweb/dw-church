/**
 * Planner API client (admin-app side).
 *
 * Calls the apps/server proxy at /api/v1/ai/planner/* — never the agents
 * service directly. The proxy adds the X-Service-Token + super_admin gate
 * and forwards body/response as-is.
 *
 * The DWChurchClient already attaches the admin's JWT via Authorization,
 * so we just reuse its raw fetch adapter for these typeless endpoints.
 */
import type { DWChurchClient } from '@dw-church/api-client';

interface SuggestRes { suggestions: string[] }
interface MarketingInsightRes { insight: string }
interface AutoStrategyRes { strategy: Record<string, unknown> }
interface DesignSystemRes { designSystem: Record<string, unknown> }
interface SitemapRes { pages: Array<{ name: string; slug: string; parent?: string }> }
interface PageContentRes { sections: Array<Record<string, unknown>>; pageName: string; pageSlug: string }
interface ContentMapRes {
  contentMap: Record<string, { pageName: string; purpose?: string; keyMessage?: string; sections: Array<Record<string, unknown>> }>
}
interface BuildPageRes { page: string; sections_built: number; blocks: Array<Record<string, unknown>> }

interface JobShape {
  id: string;
  kind: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  output?: unknown;
  error?: string | null;
  progress?: Record<string, unknown>;
}

export interface BuildPagesInput {
  tenantSlug: string;
  business: Record<string, unknown>;
  // Marketing strategy from the auto-strategy step. Persisted into the
  // tenant's settings so per-page AI calls can read it back later.
  strategy?: Record<string, unknown>;
  designSystem: Record<string, unknown>;
  sitemap: Array<{ name: string; slug: string; parent?: string }>;
  pageContents: Record<string, Array<Record<string, unknown>>>;
  /**
   * Phase-3 optional per-section design overrides. Keyed by
   * `${pageSlug}#${sortOrder}` so the wizard's Design step can attach a
   * BlockStyle to a specific section (e.g. "hero on /home gets accent
   * background") without changing the global theme. Loose
   * Record<string, unknown> here; server validates against blockStyleSchema.
   */
  perSection?: Record<string, Record<string, unknown>>;
}

export interface BuildPagesRes {
  tenantSchema: string;
  pagesCreated: number;
  sectionsCreated: number;
  menusCreated: number;
  errors: string[];
  /** Non-blocking advisory (e.g. "planner forgot CTA on /pricing —
   *  synthesized fallback"). Build succeeded; advise prompt tuning. */
  warnings?: string[];
}

/**
 * AI Planner endpoints (auto-strategy / design-system / sitemap / page-
 * content / content-map / build-page / build-pages) routinely take 30-110
 * seconds because they wait on Claude. Cloudflare's proxy enforces a hard
 * 100s origin-timeout on Free/Pro/Business plans → operators see HTTP 524.
 *
 * Bypass: route these calls through `api-direct.truelight.app`, a sister
 * sub-domain on the same Railway service but with Cloudflare DNS set to
 * "DNS only" (gray cloud). The TLS / Cloudflare edge stays untouched for
 * api.truelight.app (WAF, caching, DDoS) — only the long-running planner
 * traffic skips the proxy.
 *
 * Resolution order:
 *   1. VITE_PLANNER_DIRECT_BASE_URL  (explicit override — dev / preview)
 *   2. Same-origin admin SPA → derive 'api-direct.{tail}' from window host
 *   3. Fallback to client.fetchAdapter.baseUrl (legacy / no-bypass setups)
 *
 * Returning the legacy baseUrl when (1) and (2) miss is intentional —
 * dev (localhost) doesn't need the bypass and operators running a stand-
 * alone admin without the api-direct DNS record stay functional (just
 * still exposed to 524 on heavy steps).
 */
function resolvePlannerBaseUrl(fallbackBaseUrl: string): string {
  const override = (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { VITE_PLANNER_DIRECT_BASE_URL?: string } }).env?.VITE_PLANNER_DIRECT_BASE_URL) || '';
  if (override) return override;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.startsWith('admin.')) {
      return `https://api-direct.${host.slice('admin.'.length)}`;
    }
  }
  return fallbackBaseUrl;
}

export function makePlannerApi(client: DWChurchClient) {
  // The default FetchAdapter snake-cases request bodies and camel-cases
  // responses. The planner endpoints already speak camelCase on both
  // sides, so going through the adapter would silently corrupt keys
  // (businessName → business_name → 400 from agents). Bypass it via raw
  // fetch using the same baseUrl + headers that the client already
  // captured.
  const baseUrl = (client as unknown as { fetchAdapter?: { baseUrl: string; headers: Record<string, string> } }).fetchAdapter;
  // Defensive: fall through to client.adapter for unit tests where the
  // adapter is mocked (mocks satisfy ApiAdapter, not FetchAdapter).
  if (!baseUrl) {
    return makeAdapterFallback(client);
  }
  const fa = baseUrl;
  // 524-bypass base URL. AI Planner / build-pages traffic only — every
  // other admin call keeps using fa.baseUrl (which goes through the
  // Cloudflare proxy).
  const plannerBase = resolvePlannerBaseUrl(fa.baseUrl);

  async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${plannerBase}/api/v1/ai/planner${path}`, {
      method: 'POST',
      headers: {
        ...stripTenantHeaders(fa.headers),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown = null;
    if (text) { try { json = JSON.parse(text); } catch { /* keep null */ } }
    if (!res.ok) {
      const detail = (json && typeof json === 'object' && 'error' in json
        ? String((json as { error: { message?: string } }).error?.message || JSON.stringify(json))
        : `HTTP ${res.status}`);
      throw new Error(detail);
    }
    return (json ?? {}) as T;
  }

  // ── Async-mode (background-job) ───────────────────────────────────
  // For long-running endpoints (content-map et al.) the SPA can submit
  // the work as an ai_jobs row instead of holding the HTTP connection
  // open. The same input shape goes in, the same result shape comes out;
  // the only differences are (a) one extra round-trip + (b) ~1s polling
  // cadence. The big win is resilience to refresh / wifi blip — the job
  // keeps running on the server and the wizard can rejoin via the
  // returned jobId (persisted in localStorage by the caller).

  async function callJobsEndpoint(method: string, path: string, body?: unknown): Promise<JobShape> {
    const init: RequestInit = {
      method,
      headers: { ...stripTenantHeaders(fa.headers), 'Content-Type': 'application/json' },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(`${plannerBase}/api/v1/ai/jobs${path}`, init);
    const text = await res.text();
    let json: unknown = null;
    if (text) { try { json = JSON.parse(text); } catch { /* keep null */ } }
    if (!res.ok) {
      const detail = (json && typeof json === 'object' && 'error' in json
        ? String((json as { error: { message?: string } }).error?.message || JSON.stringify(json))
        : `HTTP ${res.status}`);
      throw new Error(detail);
    }
    return (json ?? {}) as JobShape;
  }

  /**
   * Create a backgrounded job and return the row immediately. Caller
   * is responsible for polling — see waitJob below.
   */
  async function createJob(kind: string, input: Record<string, unknown>): Promise<JobShape> {
    return callJobsEndpoint('POST', '', { kind, input });
  }

  async function getJob(jobId: string): Promise<JobShape> {
    return callJobsEndpoint('GET', `/${encodeURIComponent(jobId)}`);
  }

  /**
   * Poll the jobs endpoint until status leaves the active states.
   * Throws on 'failed' / 'cancelled'. Polls every 2s — content-map
   * runs ~50s end-to-end, so 25 polls average. Caller can pass an
   * AbortSignal to stop polling early (the server-side job keeps
   * running unless DELETEd separately).
   */
  async function waitJob(jobId: string, opts: { signal?: AbortSignal; pollMs?: number } = {}): Promise<unknown> {
    const pollMs = opts.pollMs ?? 2000;
    while (true) {
      if (opts.signal?.aborted) throw new Error('aborted');
      const job = await getJob(jobId);
      if (job.status === 'completed') return job.output;
      if (job.status === 'failed') throw new Error(job.error || 'job failed');
      if (job.status === 'cancelled') throw new Error('job cancelled');
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }

  /**
   * Convenience: create a job and wait for it. Returns the same shape
   * the synchronous endpoint would have returned.
   */
  async function runJob<T>(kind: string, input: Record<string, unknown>, opts?: { signal?: AbortSignal; onJobId?: (id: string) => void }): Promise<T> {
    const job = await createJob(kind, input);
    opts?.onJobId?.(job.id);
    const out = await waitJob(job.id, { signal: opts?.signal });
    return out as T;
  }

  async function buildPages(input: BuildPagesInput): Promise<BuildPagesRes> {
    const res = await fetch(`${plannerBase}/api/v1/ai/build-pages`, {
      method: 'POST',
      headers: { ...stripTenantHeaders(fa.headers), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const text = await res.text();
    let json: unknown = null;
    if (text) { try { json = JSON.parse(text); } catch { /* keep null */ } }
    if (!res.ok) {
      const detail = (json && typeof json === 'object' && 'error' in json
        ? String((json as { error: { message?: string } }).error?.message || JSON.stringify(json))
        : `HTTP ${res.status}`);
      throw new Error(detail);
    }
    const data = (json && typeof json === 'object' && 'data' in json
      ? (json as { data: BuildPagesRes }).data
      : json) as BuildPagesRes;
    return data;
  }

  return {
    parseBusiness: (prompt: string, model = 'gemini') =>
      call<{ business: Record<string, unknown> }>('/parse-business', { prompt, model }),

    suggest: (field: string, context: Record<string, unknown>, model = 'claude') =>
      call<SuggestRes>('/suggest', { field, context, model }),

    marketingInsight: (data: Record<string, unknown>) =>
      call<MarketingInsightRes>('/marketing-insight', data),

    autoStrategy: (data: Record<string, unknown>) =>
      call<AutoStrategyRes>('/auto-strategy', data),

    designSystem: (data: Record<string, unknown>) =>
      call<DesignSystemRes>('/design-system', data),

    sitemap: (data: Record<string, unknown>) => call<SitemapRes>('/sitemap', data),

    pageContent: (data: Record<string, unknown>) => call<PageContentRes>('/page-content', data),

    contentMap: (data: Record<string, unknown>) => call<ContentMapRes>('/content-map', data),

    /**
     * Backgrounded version of contentMap. Same input/output shape but
     * goes through /ai/jobs so the request survives browser refresh.
     * onJobId callback fires once the job is queued so the caller can
     * persist the id (e.g. localStorage) for resume.
     */
    contentMapAsync: (
      data: Record<string, unknown>,
      opts?: { signal?: AbortSignal; onJobId?: (id: string) => void },
    ) => runJob<ContentMapRes>('planner:content-map', data, opts),

    buildPage: (data: Record<string, unknown>) => call<BuildPageRes>('/build-page', data),

    crawlSites: (urls: string[]) => call<Record<string, unknown>>('/crawl-sites', { urls }),

    census: (location: string) => call<Record<string, unknown>>('/census', { location }),

    buildPages,

    // Job-mode primitives — exposed so the wizard can resume an
    // in-flight job by polling getJob directly with a stored jobId.
    waitJob,
    getJob,
  };
}

function makeAdapterFallback(_client: DWChurchClient): never {
  // Tests should provide their own FetchAdapter — never reached in prod.
  // Explicit `: never` so makePlannerApi's return type isn't widened to
  // `void | PlannerApi` (which then breaks every call site downstream).
  throw new Error('planner-api requires FetchAdapter on client');
}

/**
 * super_admin opens the AI builder from /super-admin where there is no
 * implicit tenant context. Strip any X-Tenant-Slug / X-Tenant-Id that
 * may have leaked into the shared client (e.g. from a stale session
 * snapshot) — the proxy + build-pages routes resolve the target tenant
 * from the JSON body, never from headers, so sending these would only
 * cause the global tenant middleware to 404 when the leaked slug
 * doesn't match a real tenant.
 */
function stripTenantHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (lower === 'x-tenant-slug' || lower === 'x-tenant-id') continue;
    out[k] = v;
  }
  return out;
}

export type PlannerApi = ReturnType<typeof makePlannerApi>;
