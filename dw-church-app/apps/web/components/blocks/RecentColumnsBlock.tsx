import { getColumns } from '@/lib/api';
import Link from 'next/link';

interface RecentColumnsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  const plain = text.replace(/<[^>]*>/g, '');
  return plain.length > max ? `${plain.slice(0, max)}...` : plain;
}

export async function RecentColumnsBlock({ props, slug }: RecentColumnsBlockProps) {
  const limit = (props.limit as number) ?? 6;
  const title = (props.title as string) || '목회칼럼';
  const variant = (props.variant as string) || 'grid-3';
  const columns = variant === 'grid-2' ? 2 : variant === 'grid-4' ? 4 : variant === 'list' ? 1 : 3;

  let data: any[] = [];
  try {
    const result = await getColumns(slug, { perPage: limit });
    data = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    data = [];
  }

  if (data.length === 0) return null;

  const gridClass = columns === 1
    ? 'grid-cols-1'
    : columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-background)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        <div className={`grid ${gridClass} gap-6`}>
          {data.map((col: any) => {
            const colTitle = col.title ?? '';
            const content = col.content ?? '';
            const imageUrl = col.topImageUrl ?? col.top_image_url ?? col.thumbnailUrl ?? col.thumbnail_url ?? '';
            const date = col.createdAt ?? col.created_at ?? '';
            const id = col.id ?? '';

            return (
              <Link
                key={id}
                href={`/columns/${id}`}
                className="group block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {imageUrl && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={colTitle}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold font-heading text-base line-clamp-2 group-hover:text-[var(--dw-primary)] transition-colors">
                    {colTitle}
                  </h3>
                  {content && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{truncate(content, 100)}</p>
                  )}
                  {date && (
                    <p className="mt-2 text-xs text-gray-400">{formatDate(date)}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
