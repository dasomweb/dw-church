import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * On-demand cache invalidation. Called by the api-server after a tenant mutation
 * so the public storefront reflects an admin publish immediately (instead of
 * waiting out the time-based revalidate window).
 *
 * Body: { tag?: string, path?: string }
 *   - tag  : e.g. "tenant:<slug>" — purges every cached fetch tagged for that
 *            tenant (see apps/web/lib/api.ts). Preferred.
 *   - path : legacy path-based revalidation (still supported).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { tag?: string; path?: string };
  const { tag, path } = body;

  if (tag) revalidateTag(tag);
  if (path) revalidatePath(path);
  if (!tag && !path) revalidatePath('/');

  return NextResponse.json({ revalidated: true, tag: tag ?? null, path: path ?? null });
}
