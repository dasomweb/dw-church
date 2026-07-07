'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * First-party page-view beacon. Fires once per page view (mount + every
 * client-side route change) to POST /api/v1/analytics/hit. Uses a persistent
 * localStorage visitor id + a per-session sessionStorage id so the report can
 * count unique visitors and sessions without cookies or PII.
 *
 * We use fetch({keepalive}) rather than navigator.sendBeacon because the tenant
 * is identified by the X-Tenant-Slug header and sendBeacon can't set headers.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

function id(key: string, store: Storage): string {
  try {
    let v = store.getItem(key);
    if (!v) {
      v =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      store.setItem(key, v);
    }
    return v;
  } catch {
    // Private mode / storage disabled — fall back to an ephemeral id.
    return 'anon';
  }
}

/** External referrer host only (same-origin navigation is not a referrer). */
function externalReferrerHost(): string {
  try {
    if (!document.referrer) return '';
    const h = new URL(document.referrer).host;
    return h && h !== window.location.host ? h : '';
  } catch {
    return '';
  }
}

export default function AnalyticsBeacon({ slug }: { slug: string }) {
  const pathname = usePathname();

  useEffect(() => {
    // Never track inside the super-admin live-preview iframe — it would inflate
    // real visitor stats with operator preview loads.
    if (typeof window !== 'undefined' && window.self !== window.top) return;

    // Clean per-tenant path: strip the "/tenant/<slug>" prefix that only the
    // bare platform host carries, so paths match across subdomain/custom-domain.
    let path = pathname || '/';
    const prefix = `/tenant/${slug}`;
    if (path === prefix) path = '/';
    else if (path.startsWith(prefix + '/')) path = path.slice(prefix.length);

    const vid = id('tl_vid', window.localStorage);
    const sid = id('tl_sid', window.sessionStorage);
    const ref = externalReferrerHost();

    try {
      void fetch(`${API_BASE}/api/v1/analytics/hit`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
        body: JSON.stringify({ path, vid, sid, ref }),
      }).catch(() => {});
    } catch {
      // best-effort — analytics must never break the page
    }
  }, [pathname, slug]);

  return null;
}
