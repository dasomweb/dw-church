import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Main landing page
  if (
    hostname === 'dw-church.app' ||
    hostname === 'www.dw-church.app' ||
    hostname === 'localhost:3002'
  ) {
    return NextResponse.next();
  }

  // Extract tenant slug from subdomain
  const slug = hostname.split('.')[0];
  if (slug && slug !== 'www' && slug !== 'admin') {
    // Rewrite to /tenant/[slug]/... path
    return NextResponse.rewrite(new URL(`/tenant/${slug}${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
