import { z } from 'zod';

/**
 * Analytics — self-hosted, first-party website usage tracking.
 *
 * Collection is a public beacon (POST /analytics/hit) fired by the storefront
 * on each page view. The report (GET /analytics/summary) is admin-only and
 * tenant-scoped (a church admin sees only their own tenant; a super_admin can
 * view any tenant via the X-Tenant-Slug header — see auth.resolveUser rebind).
 *
 * Privacy: we store a first-party random visitor id (from the browser's
 * localStorage, not an ad identifier), a coarse device class, and the external
 * referrer HOST only. No IP, no full user-agent, no cookies.
 */

/** Beacon payload. All fields optional/short — a bad beacon must never 500. */
export const hitSchema = z.object({
  path: z.string().max(512).optional(),
  // First-party visitor id (localStorage) + per-session id (sessionStorage).
  vid: z.string().max(64).optional(),
  sid: z.string().max(64).optional(),
  // External referrer host only (client already strips same-origin nav).
  ref: z.string().max(255).optional(),
});
export type HitInput = z.infer<typeof hitSchema>;

/** Report range presets → day counts live in the service. */
export const summaryQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('30d'),
});
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
