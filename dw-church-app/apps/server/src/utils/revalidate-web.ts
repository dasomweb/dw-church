import { env } from '../config/env.js';

/**
 * Per-tenant storefront cache purge.
 *
 * After a tenant mutation the api-server asks the Next.js web app to drop that
 * tenant's cached fetches (tagged `tenant:<slug>` in apps/web/lib/api.ts) so a
 * publish shows up on the public site immediately instead of waiting out the
 * time-based revalidate window.
 *
 * Fire-and-forget + debounced: a burst of writes (e.g. saving many sections in
 * one publish) collapses into a single purge ~1.5s after the last write. Never
 * throws into the request path. No-op unless REVALIDATE_SECRET is configured.
 */
const DEBOUNCE_MS = 1500;
const pending = new Map<string, NodeJS.Timeout>();

export function purgeTenantCache(slug: string): void {
  if (!env.REVALIDATE_SECRET || !env.WEB_BASE_URL) return;
  if (!slug || !/^[a-z0-9-]{1,63}$/.test(slug)) return;

  const existing = pending.get(slug);
  if (existing) clearTimeout(existing);

  pending.set(
    slug,
    setTimeout(() => {
      pending.delete(slug);
      void firePurge(slug);
    }, DEBOUNCE_MS),
  );
}

async function firePurge(slug: string): Promise<void> {
  try {
    await fetch(`${env.WEB_BASE_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': env.REVALIDATE_SECRET,
      },
      body: JSON.stringify({ tag: `tenant:${slug}` }),
      // Never let a slow web app hold a server socket open indefinitely.
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* best-effort — storefront still refreshes on its time-based window */
  }
}
