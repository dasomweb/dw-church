/**
 * Internal HTTP client for the agents service (apps/agents).
 *
 * Extracted from planner-proxy/routes.ts so the background-job runner
 * can reuse the exact same call semantics (timeout, headers, JSON
 * passthrough) without going through the Fastify proxy layer twice.
 *
 * Body / response are forwarded as-is — agents endpoints already use
 * camelCase keys, and re-routing through the global FetchAdapter would
 * snake_case them mid-flight.
 */
import { env } from '../../../config/env.js';
import { AppError } from '../../../middleware/error-handler.js';

export interface CallAgentsResult {
  status: number;
  /** Raw text body. Caller decides whether to parse. */
  body: string;
}

/**
 * Per-endpoint timeout overrides. Most agent calls finish under 60s,
 * but a few endpoints generate long narrative output and reliably push
 * past the default 180s ceiling — particularly marketing-insight (6000-
 * token markdown report) and content-map (parallel page generation).
 * Each entry is millis. Callers can still pass `opts.timeoutMs` to
 * override; this table is the floor for known-heavy endpoints.
 */
const PER_ENDPOINT_TIMEOUT_MS: Record<string, number> = {
  // 8-section markdown report. Sonnet at 6000 max_tokens routinely
  // takes 2-3 min cold-cache, especially in Korean (more tokens per
  // character). User report "Agents call exceeded 180s and was
  // aborted (marketing-insight)" was the trigger.
  'marketing-insight': 5 * 60 * 1000,
  // Parallel-batched per-page content generation; the slowest single
  // wizard call by design. 5 min gives headroom for a 10-page site.
  'content-map': 5 * 60 * 1000,
};

/**
 * POST a JSON body to the agents service at the given sub-path
 * (relative to /api/planner). Returns the response status + raw text.
 *
 * Throws AppError(503/504) on connection / timeout failure. Does NOT
 * throw on a 4xx/5xx response status — the caller decides what to do.
 *
 * @param subPath e.g. "content-map" or "design-system" (no leading slash)
 * @param body    arbitrary JSON-serializable object
 * @param opts.timeoutMs explicit override; otherwise PER_ENDPOINT_TIMEOUT_MS
 *                      lookup falls back to 180s default.
 */
export async function callAgents(
  subPath: string,
  body: unknown,
  opts: { timeoutMs?: number } = {},
): Promise<CallAgentsResult> {
  if (!env.INTERNAL_SERVICE_TOKEN) {
    throw new AppError('CONFIG_ERROR', 503, 'INTERNAL_SERVICE_TOKEN not configured');
  }
  const upstream = `${env.AGENTS_BASE_URL.replace(/\/$/, '')}/api/planner/${subPath}`;
  const perEndpoint = PER_ENDPOINT_TIMEOUT_MS[subPath];
  const timeoutMs = opts.timeoutMs ?? perEndpoint ?? 3 * 60 * 1000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.INTERNAL_SERVICE_TOKEN}`,
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new AppError(
      aborted ? 'AGENTS_TIMEOUT' : 'AGENTS_UNREACHABLE',
      aborted ? 504 : 503,
      aborted
        ? `Agents call exceeded ${timeoutMs / 1000}s and was aborted (${subPath})`
        : `Agents service unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  clearTimeout(timer);

  const text = await response.text();
  return { status: response.status, body: text };
}
