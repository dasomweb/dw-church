import { getColumns } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
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

  if (data.length === 0) {
    return (
      <DataSection props={props}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400 text-sm">등록된 칼럼이 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  const gridClass = columns === 1
    ? 'grid-cols-1'
    : columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <DataSection props={props} defaultBg="var(--dw-background)">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
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
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="aspect-video overflow-hidden bg-gray-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={colTitle}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/90 text-2xl sm:text-3xl" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #2563eb), var(--dw-secondary, #64748b))' }}>✍️</div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold font-heading text-base leading-snug line-clamp-2 group-hover:text-[var(--dw-primary)] transition-colors">
                    {colTitle}
                  </h3>
                  {content && (
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2">{truncate(content, 110)}</p>
                  )}
                  {date && (
                    <p className="mt-3 pt-3 border-t border-black/[0.05] text-xs text-gray-400">{formatDate(date)}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </DataSection>
  );
}
