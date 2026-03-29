import { NextRequest, NextResponse } from 'next/server';

/** Known platform hostnames (not custom domains) */
const PLATFORM_HOSTS = new Set([
  'dw-church.app',
  'www.dw-church.app',
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

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // API subdomain → proxy to Railway
  if (hostname.startsWith('api.truelight.app') || hostname.startsWith('api.localhost')) {
    const railwayUrl = process.env.RAILWAY_API_URL || 'https://api-server-production-c612.up.railway.app';
    return NextResponse.rewrite(new URL(`${railwayUrl}${pathname}${request.nextUrl.search}`));
  }

  // Main landing page
  if (PLATFORM_HOSTS.has(hostname)) {
    return NextResponse.next();
  }

  // Custom domain handling — if the host is not a platform host, it may be a custom domain
  if (!isPlatformHost(hostname)) {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-c612.up.railway.app';
      const res = await fetch(
        `${apiBase}/api/v1/admin/tenants/resolve-domain?domain=${encodeURIComponent(hostname.split(':')[0])}`,
        { headers: { 'x-internal': '1' }, next: { revalidate: 60 } },
      );
      if (res.ok) {
        const { slug } = (await res.json()) as { slug: string };
        if (slug) {
          const url = new URL(`/tenant/${slug}${pathname}`, request.url);
          url.search = request.nextUrl.search;
          return NextResponse.rewrite(url);
        }
      }
    } catch {
      // If the lookup fails, fall through to default behavior
    }
    return NextResponse.next();
  }

  // Extract tenant slug from subdomain
  const slug = hostname.split('.')[0];
  if (slug && slug !== 'www' && slug !== 'admin' && slug !== 'api') {
    // Verify tenant exists via API
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-c612.up.railway.app';
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
