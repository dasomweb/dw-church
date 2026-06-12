import { useEffect, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';

interface Cat { id: string; name: string; slug: string }

/**
 * Dynamic category dropdown for the album_gallery block. Lists the tenant's
 * registered album categories (from /api/v1/taxonomies/album_category) so the
 * operator picks instead of typing. Stores the slug; empty = all albums. The
 * server's album list matches the slug OR the name.
 *
 * The taxonomy endpoint returns { data: [{ id, name, slug, count, ... }] }
 * (camelized by the adapter). Fetches directly through the client (not a
 * React-Query hook) to avoid the super-admin builder's stale static-key cache;
 * a fresh fetch on mount always uses the current X-Tenant-Slug header.
 */
export function AlbumCategorySelectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const client = useDWChurchClient();
  const [cats, setCats] = useState<Cat[]>([]);

  useEffect(() => {
    if (!client) return;
    let alive = true;
    (async () => {
      try {
        const res = await client.adapter.get<{ data: Cat[] }>(
          '/api/v1/taxonomies/album_category',
        );
        const mapped = (res?.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        }));
        if (alive) setCats(mapped);
      } catch { /* leave empty */ }
    })();
    return () => { alive = false; };
  }, [client]);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
    >
      <option value="">전체</option>
      {cats.map((c) => (
        <option key={c.id} value={c.slug}>{c.name}</option>
      ))}
    </select>
  );
}
