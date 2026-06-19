import { NextResponse } from 'next/server';

// Liveness probe for the web (storefront) service. Pinged by the api-server's
// /admin/services-health aggregator for the super-admin monitoring page. Under
// /api so the tenant middleware (matcher excludes /api) never rewrites it.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok', service: 'web' });
}
