'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

export interface SiteBrand {
  logoUrl: string | null;
  logoHeight: number | null;
  faviconUrl: string | null;
  siteName: string | null;
  tagline: string | null;
  contactEmail: string | null;
  kakaoUrl: string | null;
}

// Module-level cache so the header logo, favicon setter, and footer share one
// fetch across the marketing pages.
let cache: SiteBrand | null = null;
let inflight: Promise<SiteBrand | null> | null = null;

function load(): Promise<SiteBrand | null> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch(`${API_BASE}/api/v1/marketing-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { cache = (j?.data as SiteBrand) ?? null; return cache; })
      .catch(() => null);
  }
  return inflight;
}

export function useSiteBrand(): SiteBrand | null {
  const [brand, setBrand] = useState<SiteBrand | null>(cache);
  useEffect(() => {
    let on = true;
    void load().then((v) => { if (on) setBrand(v); });
    return () => { on = false; };
  }, []);
  return brand;
}
