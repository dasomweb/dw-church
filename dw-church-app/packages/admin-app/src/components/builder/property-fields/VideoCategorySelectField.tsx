import { useVideoCategories } from '@dw-church/api-client';

/**
 * Dynamic category dropdown for the video_board block. Lists the tenant's
 * registered video categories (from /videos/categories) so the operator picks
 * instead of typing a slug. Stores the slug; empty = all categories. The
 * server's video list matches the slug OR the name, so older blocks that
 * stored a name still resolve.
 */
export function VideoCategorySelectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: categories } = useVideoCategories();
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
    >
      <option value="">전체 (모든 카테고리)</option>
      {(categories ?? []).map((c) => (
        <option key={c.id} value={c.slug}>{c.name}</option>
      ))}
    </select>
  );
}
