import type { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { cloudflareConfigStatus } from '../../config/cloudflare.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import { verifyDomain } from './service.js';

/**
 * Background auto-verify for custom domains.
 *
 * Wiring a custom domain into public.tenants.custom_domain only happens inside
 * verifyDomain(), which used to be reachable ONLY by the operator clicking
 * "연결 확인". If nobody clicked it (or clicked before Cloudflare finished SSL),
 * the domain stayed unwired and the site 404'd — the exact lagrangechurch bug.
 *
 * This sweep periodically re-checks every pending domain (verified_at IS NULL)
 * against Cloudflare and lets verifyDomain wire it automatically the moment
 * routing + SSL go active. No operator action required.
 */

const INTERVAL_MS = 5 * 60 * 1000; // re-check pending domains every 5 minutes
const FIRST_RUN_DELAY_MS = 30 * 1000; // let the server settle before the first sweep
// Stop polling domains abandoned long ago (added but DNS never set) so we don't
// hammer the Cloudflare API forever. A re-verify from the UI still works anytime.
const MAX_AGE_DAYS = 30;

async function sweepOnce(app: FastifyInstance): Promise<void> {
  // No Cloudflare creds → verify can't do anything; skip the whole sweep.
  if (!cloudflareConfigStatus().configured) return;

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  for (const t of tenants) {
    let schema: string;
    try {
      schema = validateSchemaName(`tenant_${t.slug}`);
    } catch {
      continue;
    }

    let pending: { id: string }[];
    try {
      pending = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "${schema}".custom_domains
          WHERE verified_at IS NULL
            AND cf_hostname_id IS NOT NULL
            AND created_at > now() - make_interval(days => ${MAX_AGE_DAYS})`,
      );
    } catch {
      // Tenant schema has no custom_domains table (older tenant) — nothing to do.
      continue;
    }

    for (const d of pending) {
      try {
        const res = await verifyDomain(schema, t.id, d.id);
        if (res.domain.verified_at) {
          app.log.info(`[domain-auto-verify] wired ${res.domain.domain} → tenant ${t.slug}`);
        }
      } catch {
        // Cloudflare transient / not active yet — leave it for the next sweep.
      }
    }
  }
}

export function startDomainAutoVerify(app: FastifyInstance): void {
  const run = () => {
    void sweepOnce(app).catch((e) => app.log.warn(`[domain-auto-verify] sweep failed: ${e}`));
  };
  setTimeout(run, FIRST_RUN_DELAY_MS);
  setInterval(run, INTERVAL_MS);
  app.log.info('[domain-auto-verify] background sweep scheduled (every 5m)');
}
