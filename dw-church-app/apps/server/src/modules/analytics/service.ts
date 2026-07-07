import { prisma } from '../../config/database.js';
import type { HitInput } from './schema.js';

/**
 * Analytics service — reads/writes the shared public.site_visits table.
 *
 * A shared table (with a tenant_slug column) — not a per-tenant schema table —
 * because (a) the operator report compares tenants and (b) churches are low
 * traffic, so one indexed table on (tenant_slug, created_at) is simplest and
 * cheapest. Every query is filtered by tenant_slug; the slug is derived from
 * the authenticated request (auth rebinds a mismatched X-Tenant-Slug), so a
 * church admin can never read another tenant's rows.
 *
 * The table is created at startup in index.ts (raw SQL, IF NOT EXISTS) — the
 * same pattern as the other runtime migrations.
 */

const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

/** Bucket day resolution in US-East wall time (target churches are US East). */
const TZ = 'America/New_York';

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|monitor|curl|wget|python-requests|axios|node-fetch|pingdom|uptime/i;

function classifyDevice(ua: string | undefined): string {
  if (!ua) return 'unknown';
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return 'tablet';
  if (/mobi|iphone|android.*mobile|phone/.test(s)) return 'mobile';
  return 'desktop';
}

/** Returns true if the hit was recorded, false if skipped (bot / no slug). */
export async function recordHit(
  slug: string,
  body: HitInput,
  userAgent: string | undefined,
): Promise<boolean> {
  if (BOT_RE.test(userAgent ?? '')) return false;

  const path = (body.path || '/').slice(0, 512);
  const vid = (body.vid || 'anon').slice(0, 64);
  const sid = (body.sid || vid).slice(0, 64);
  const ref = (body.ref || '').slice(0, 255) || null;
  const device = classifyDevice(userAgent);

  await prisma.$executeRawUnsafe(
    `INSERT INTO public.site_visits (tenant_slug, visitor_id, session_id, path, referrer_host, device)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    slug,
    vid,
    sid,
    path,
    ref,
    device,
  );
  return true;
}

interface Totals { pageviews: number; visitors: number; sessions: number }

export interface AnalyticsSummary {
  range: string;
  days: number;
  totals: Totals & { activeNow: number };
  /** Percent change vs the immediately-preceding period (null if no prior data). */
  deltas: { pageviews: number | null; visitors: number | null; sessions: number | null };
  /** Continuous, zero-filled daily series (oldest → newest). */
  daily: { day: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  referrers: { host: string; views: number }[];
  devices: { device: string; views: number }[];
}

function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

/** Build the continuous list of YYYY-MM-DD labels (US-East) for the last N days. */
function dayAxis(days: number): string[] {
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(`${todayET}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function getSummary(slug: string, range: string): Promise<AnalyticsSummary> {
  const days = RANGE_DAYS[range] ?? 30;

  const totalsRows = await prisma.$queryRawUnsafe<Totals[]>(
    `SELECT COUNT(*)::int AS pageviews,
            COUNT(DISTINCT visitor_id)::int AS visitors,
            COUNT(DISTINCT session_id)::int AS sessions
       FROM public.site_visits
      WHERE tenant_slug = $1 AND created_at >= now() - make_interval(days => $2::int)`,
    slug,
    days,
  );
  const totals = totalsRows[0] ?? { pageviews: 0, visitors: 0, sessions: 0 };

  const prevRows = await prisma.$queryRawUnsafe<Totals[]>(
    `SELECT COUNT(*)::int AS pageviews,
            COUNT(DISTINCT visitor_id)::int AS visitors,
            COUNT(DISTINCT session_id)::int AS sessions
       FROM public.site_visits
      WHERE tenant_slug = $1
        AND created_at >= now() - make_interval(days => $2::int)
        AND created_at <  now() - make_interval(days => $3::int)`,
    slug,
    days * 2,
    days,
  );
  const prev = prevRows[0] ?? { pageviews: 0, visitors: 0, sessions: 0 };

  const activeRows = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(DISTINCT visitor_id)::int AS n
       FROM public.site_visits
      WHERE tenant_slug = $1 AND created_at >= now() - interval '5 minutes'`,
    slug,
  );
  const activeNow = activeRows[0]?.n ?? 0;

  const dailyRows = await prisma.$queryRawUnsafe<{ day: string; views: number; visitors: number }[]>(
    `SELECT to_char(date_trunc('day', created_at AT TIME ZONE $2), 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS views,
            COUNT(DISTINCT visitor_id)::int AS visitors
       FROM public.site_visits
      WHERE tenant_slug = $1 AND created_at >= now() - make_interval(days => $3::int)
      GROUP BY 1 ORDER BY 1`,
    slug,
    TZ,
    days,
  );
  const dailyMap = new Map(dailyRows.map((r) => [r.day, r]));
  const daily = dayAxis(days).map((day) => dailyMap.get(day) ?? { day, views: 0, visitors: 0 });

  const topPages = await prisma.$queryRawUnsafe<{ path: string; views: number }[]>(
    `SELECT path, COUNT(*)::int AS views
       FROM public.site_visits
      WHERE tenant_slug = $1 AND created_at >= now() - make_interval(days => $2::int)
      GROUP BY path ORDER BY views DESC LIMIT 8`,
    slug,
    days,
  );

  const referrers = await prisma.$queryRawUnsafe<{ host: string; views: number }[]>(
    `SELECT referrer_host AS host, COUNT(*)::int AS views
       FROM public.site_visits
      WHERE tenant_slug = $1 AND created_at >= now() - make_interval(days => $2::int)
        AND referrer_host IS NOT NULL AND referrer_host <> ''
      GROUP BY 1 ORDER BY views DESC LIMIT 6`,
    slug,
    days,
  );

  const devices = await prisma.$queryRawUnsafe<{ device: string; views: number }[]>(
    `SELECT device, COUNT(*)::int AS views
       FROM public.site_visits
      WHERE tenant_slug = $1 AND created_at >= now() - make_interval(days => $2::int)
      GROUP BY device ORDER BY views DESC`,
    slug,
    days,
  );

  return {
    range,
    days,
    totals: { ...totals, activeNow },
    deltas: {
      pageviews: pctDelta(totals.pageviews, prev.pageviews),
      visitors: pctDelta(totals.visitors, prev.visitors),
      sessions: pctDelta(totals.sessions, prev.sessions),
    },
    daily,
    topPages,
    referrers,
    devices,
  };
}
