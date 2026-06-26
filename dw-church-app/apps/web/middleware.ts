import { NextRequest, NextResponse } from 'next/server';

/** Known platform hostnames (not custom domains) */
const PLATFORM_HOSTS = new Set([
  'truelight.app',
  'www.truelight.app',
  'customers.truelight.app',  // SaaS proxy fallback origin — internal
  'localhost:3002',
]);

/** Check if a hostname belongs to the platform (*.truelight.app or known hosts) */
function isPlatformHost(hostname: string): boolean {
  if (PLATFORM_HOSTS.has(hostname)) return true;
  // Any subdomain of truelight.app
  if (hostname.endsWith('.truelight.app')) return true;
  // Localhost subdomains for development
  if (hostname.endsWith('.localhost:3002') || hostname === 'localhost:3002') return true;
  return false;
}

/**
 * Resolve the originating hostname. The saas-proxy Worker stamps
 * X-Tenant-Host (original tenant hostname) and X-Tenant-Verify (shared
 * secret) when it re-issues a request to customers.truelight.app. When
 * both check out we trust X-Tenant-Host so the custom-domain branch
 * below sees the real tenant hostname (www.korean-church.com) instead
 * of the proxy destination (customers.truelight.app).
 *
 * Custom header names (not X-Forwarded-Host) are required because
 * Cloudflare overwrites X-Forwarded-Host with its routing destination
 * when the Worker's outbound fetch re-enters the edge.
 */
function resolveIncomingHostname(request: NextRequest): string {
  const directHost = (request.headers.get('host') || '').toLowerCase();
  const forwardedHost = request.headers.get('x-tenant-host')?.toLowerCase();
  const incomingSecret = request.headers.get('x-tenant-verify');
  const expectedSecret = process.env.SAAS_PROXY_SECRET;
  if (forwardedHost && expectedSecret && incomingSecret === expectedSecret) {
    return forwardedHost;
  }
  return directHost;
}

export async function middleware(request: NextRequest) {
  const hostname = resolveIncomingHostname(request);
  const pathname = request.nextUrl.pathname;

  // API subdomain → proxy to Railway
  if (hostname.startsWith('api.truelight.app') || hostname.startsWith('api.localhost')) {
    const railwayUrl = process.env.RAILWAY_API_URL || 'https://api.truelight.app';
    return NextResponse.rewrite(new URL(`${railwayUrl}${pathname}${request.nextUrl.search}`));
  }

  // Main landing page (+ canonicalize bare /tenant/<slug> hits).
  if (PLATFORM_HOSTS.has(hostname)) {
    // A direct hit on truelight.app/tenant/<slug>/... serves the same pages,
    // but basePath is "/tenant/<slug>" there and many block/card links are
    // basePath-relative ("/columns/123") — so they 404. Redirect to the
    // canonical tenant subdomain (basePath = "") where every link resolves.
    // Scoped to the bare production host only: subdomains never enter this
    // branch (not in PLATFORM_HOSTS), and localhost/customers are left alone
    // so dev + the SaaS proxy keep working.
    if (hostname === 'truelight.app' || hostname === 'www.truelight.app') {
      const m = pathname.match(/^\/tenant\/([^/]+)(\/.*)?$/);
      if (m) {
        const tslug = m[1];
        const rest = m[2] ?? '';
        const url = new URL(`https://${tslug}.truelight.app${rest}`);
        url.search = request.nextUrl.search;
        return NextResponse.redirect(url, 308);
      }
    }
    return NextResponse.next();
  }

  // Custom domain handling — host is not a platform host (= tenant's
  // own domain reached via Cloudflare for SaaS + Worker). Map it to its
  // tenant. A custom domain must NEVER fall through to the marketing site
  // (that would break multi-tenancy — a church domain showing TRUE LIGHT's
  // landing page). Unknown → 404; apex → redirect to the www version.
  if (!isPlatformHost(hostname)) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';
    const bareHost = hostname.split(':')[0] ?? hostname;
    const resolveSlug = async (domain: string): Promise<string | null> => {
      try {
        const res = await fetch(
          `${apiBase}/api/v1/admin/tenants/resolve-domain?domain=${encodeURIComponent(domain)}`,
          { headers: { 'x-internal': '1' }, next: { revalidate: 60 } },
        );
        if (!res.ok) return null;
        const { slug } = (await res.json()) as { slug: string | null };
        return slug || null;
      } catch {
        return null;
      }
    };

    // 1) This exact host is a mapped custom domain → serve its tenant.
    const slug = await resolveSlug(bareHost);
    if (slug) {
      const url = new URL(`/tenant/${slug}${pathname}`, request.url);
      url.search = request.nextUrl.search;
      return NextResponse.rewrite(url);
    }

    // 2) Apex (no www) whose www. version IS mapped → 308 to the www host.
    //    Apex can't be a CNAME target, so www is the canonical entry point.
    if (!bareHost.startsWith('www.') && (await resolveSlug(`www.${bareHost}`))) {
      const target = new URL(`https://www.${bareHost}${pathname}`);
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target, 308);
    }

    // 3) Unknown custom domain — show 404, never the marketing landing page.
    const notFound = new URL('/not-found', request.url);
    return NextResponse.rewrite(notFound, { status: 404 });
  }

  // Extract tenant slug from subdomain (e.g. lagrangechurch.truelight.app)
  const slug = hostname.split('.')[0];
  if (slug && slug !== 'www' && slug !== 'admin' && slug !== 'api' && slug !== 'customers') {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

    // If this tenant has an ACTIVE custom domain, the *.truelight.app subdomain
    // is no longer canonical — permanently redirect to the custom domain
    // (preserve path + query). The custom domain enters via the custom-domain
    // branch above, so this never loops.
    try {
      const res = await fetch(
        `${apiBase}/api/v1/admin/tenants/custom-domain?slug=${encodeURIComponent(slug)}`,
        { headers: { 'x-internal': '1' }, next: { revalidate: 60 } },
      );
      if (res.ok) {
        const { domain } = (await res.json()) as { domain: string | null };
        if (domain) {
          const target = new URL(`https://${domain}${pathname}`);
          target.search = request.nextUrl.search;
          return NextResponse.redirect(target, 308);
        }
      }
    } catch {
      // Lookup failed — fall through and serve the subdomain normally.
    }

    // Verify tenant exists via API
    try {
      const res = await fetch(
        `${apiBase}/api/v1/settings`,
        {
          headers: { 'X-Tenant-Slug': slug },
          next: { revalidate: 60 },
        },
      );
      if (!res.ok) {
        // Tenant doesn't exist — return 404 page
        const notFoundUrl = new URL('/not-found', request.url);
        return NextResponse.rewrite(notFoundUrl, { status: 404 });
      }
    } catch {
      // API unavailable — allow through to show error in page
    }

    // Rewrite to /tenant/[slug]/... path (preserve query string)
    const url = new URL(`/tenant/${slug}${pathname}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
