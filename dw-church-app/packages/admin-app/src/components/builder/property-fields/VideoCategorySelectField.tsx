import { useEffect, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';

interface Cat { id: string; name: string; slug: string }

/**
 * Dynamic category dropdown for the video_board block. Lists the tenant's
 * registered video categories (from /videos/categories) so the operator picks
 * instead of typing a slug. Stores the slug; empty = all categories. The
 * server's video list matches the slug OR the name, so older blocks that
 * stored a name still resolve.
 *
 * Fetches directly through the client (not the useVideoCategories hook): under
 * the super-admin builder the hook's static query key can hold a stale/empty
 * cache from before SuperAdminTenantLayout set the tenant slug. A fresh fetch
 * on mount always uses the current X-Tenant-Slug header.
 */
export function VideoCategorySelectField({
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
        const res = await client.adapter.get<{ data: Cat[] }>('/api/v1/videos/categories');
        if (alive) setCats(res?.data ?? []);
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
      <option value="">전체 (모든 카테고리)</option>
      {cats.map((c) => (
        <option key={c.id} value={c.slug}>{c.name}</option>
      ))}
    </select>
  );
}
