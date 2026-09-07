import { createContext, useContext } from 'react';

/**
 * Tenant scope — lets the tenant admin UI render identically in two places:
 *
 *  - Platform admin console (admin.truelight.app): URLs are /t/:slug/... and the
 *    slug comes from the route param. basePath = "/t/:slug".
 *  - The tenant's OWN domain (host mode): the SPA is served at <tenant>/admin,
 *    there is NO :slug in the URL, and the slug comes from the logged-in user's
 *    session (JWT tenantSlug). basePath = "" (routes live at the admin root).
 *
 * Sidebar links, the page-title lookup, and logout all build paths from
 * `basePath`, so the same AdminLayout works for both without duplicating routes.
 */
export interface TenantScope {
  slug: string;
  basePath: string; // "/t/:slug" on the admin console, "" on a tenant domain
  hostMode: boolean;
}

const TenantScopeContext = createContext<TenantScope>({ slug: '', basePath: '', hostMode: false });

export const TenantScopeProvider = TenantScopeContext.Provider;
export function useTenantScope(): TenantScope {
  return useContext(TenantScopeContext);
}

/** Build a tenant path from the scope's basePath. `to=""` → the dashboard root. */
export function tenantPath(basePath: string, to: string): string {
  if (to) return `${basePath}/${to}`;
  return basePath || '/';
}

/**
 * True when the SPA is running on a tenant's own domain (subdomain or custom
 * domain) rather than the platform admin console or local dev. In that case the
 * UI drops the /t/:slug prefix and scopes to the session's tenant.
 *
 * Kept as a plain function (not a hook) so it can be called from LoginPage,
 * router setup, etc. window.location is stable for the life of the SPA.
 */
export function detectHostMode(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  if (h === 'admin.truelight.app') return false; // super-admin / global console
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) return false; // dev uses /t/:slug
  const sub = h.match(/^([^.]+)\.truelight\.app$/);
  if (sub) return !['www', 'api', 'admin', 'customers', 'saas-proxy'].includes(sub[1] ?? '');
  // Any other host is a tenant's custom domain → host mode (slug from session).
  return true;
}
