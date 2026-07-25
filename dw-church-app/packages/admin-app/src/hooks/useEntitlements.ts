import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth';

export interface Entitlements {
  plan: string;
  features: Record<string, boolean>;
  loading: boolean;
}

/**
 * Effective plan entitlements for a tenant (GET /admin/entitlements). Raw fetch
 * — NOT the api-client — so the server's exact snake_case feature keys survive
 * (the api-client camelizes, which would rename e.g. newcomer_registration).
 * Sends X-Tenant-Slug so it works for both the tenant admin (own slug) and the
 * super-admin console (target slug).
 *
 * While loading, `features` is empty → featureAllowed() defaults to true, so nav
 * items / blocks never flash visible-then-hidden.
 */
export function useEntitlements(slug?: string): Entitlements {
  const session = useAuthStore((s) => s.session);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || !session?.accessToken) { setLoading(false); return; }
    let cancelled = false;
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const base = host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
    setLoading(true);
    void fetch(`${base}/api/v1/admin/entitlements`, {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'X-Tenant-Slug': slug },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        setPlan((j?.data?.plan as string) ?? '');
        setFeatures((j?.data?.features as Record<string, boolean>) ?? {});
      })
      .catch(() => { /* on failure leave features empty → everything allowed */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, session?.accessToken]);

  return { plan, features, loading };
}
