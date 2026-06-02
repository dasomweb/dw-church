import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import { callAgents } from './agents-client.js';

/**
 * Catch-all proxy from /api/v1/ai/planner/* → apps/agents /api/planner/*.
 *
 * Fronts the 11-endpoint planner pipeline (parse-business, suggest,
 * marketing-insight, auto-strategy, design-system, sitemap, page-content,
 * content-map, build-page, crawl-sites, census) so the admin SPA never
 * talks to the agents service directly. Authn = super_admin only — these
 * endpoints don't write to a tenant schema themselves, but they're
 * expensive (LLM calls) and surface platform-level capabilities only
 * super_admin should drive.
 *
 * Body / response are forwarded as-is (no camel/snake translation): the
 * agents endpoints already use camelCase keys (businessName, etc.) so
 * the FetchAdapter's auto-conversion would turn them into snake_case
 * mid-flight, breaking validation. We bypass it by hand-writing the
 * request and trusting the upstream JSON.
 *
 * For long-running endpoints (content-map, design-system, sitemap) the
 * SPA can also POST /api/v1/ai/jobs with kind="planner:<sub-path>"
 * instead of going through this synchronous proxy — the job runner
 * uses the same agents-client under the hood, just persisted.
 */
export async function aiPlannerProxyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/ai/planner/*', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const wildcard = (request.params as { '*'?: string })['*'] ?? '';
    if (!wildcard) {
      throw new AppError('BAD_REQUEST', 400, 'Missing planner sub-path');
    }

    const { status, body } = await callAgents(wildcard, request.body ?? {});
    if (status < 200 || status >= 300) {
      let detail = `agents responded ${status}`;
      try {
        const j = JSON.parse(body) as { detail?: unknown };
        if (j.detail) detail = String(j.detail);
      } catch { /* not JSON */ }
      throw new AppError('AGENTS_ERROR', status, detail);
    }
    // Pass JSON straight through without re-parsing through the global
    // camelize/snake adapters — keep the body as the agents emitted it.
    return reply
      .code(200)
      .header('content-type', 'application/json; charset=utf-8')
      .send(body);
  });
}
