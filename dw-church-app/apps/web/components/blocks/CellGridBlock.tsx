import { getCells } from '@/lib/api';
import { DataSection } from './DataSection';

interface CellGridBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

// 목장(셀) Data Block. Reads the cells content module and renders each 목장 as a
// card with its leader, meeting time/place and a short blurb. Fields come back
// snake_case from the public API (plain fetch, no camelization).
export async function CellGridBlock({ props, slug }: CellGridBlockProps) {
  const limit = (props.limit as number) ?? 24;
  // Column count: prefer the variant the page editor sets (grid-2/3/4, like the
  // other content blocks); fall back to a numeric columns prop / 3.
  const variant = (props.variant as string) || '';
  const columns = variant === 'grid-4' ? 4 : variant === 'grid-2' ? 2 : (Number(props.columns) || 3);

  let cells: Record<string, unknown>[] = [];
  try {
    const all = await getCells(slug);
    cells = all.slice(0, limit);
  } catch {
    cells = [];
  }

  const title = (props.title as string) || '목장 안내';

  if (cells.length === 0) {
    return (
      <DataSection props={props} defaultBg="var(--dw-surface)">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-3xl font-bold font-heading">{title}</h2>
          <p className="text-sm text-gray-400">등록된 목장이 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  const gridCols =
    columns >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4'
    : columns === 2 ? 'sm:grid-cols-2'
    : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <DataSection props={props} defaultBg="var(--dw-surface)">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        <div className={`grid grid-cols-1 gap-6 ${gridCols}`}>
          {cells.map((c, i) => {
            const photo = c.photo_url as string | null;
            const meeting = [c.meeting_day, c.meeting_time].filter(Boolean).join(' ');
            return (
              <div
                key={(c.id as string) ?? i}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: 'var(--dw-border, #e5e7eb)' }}
              >
                {photo && (
                  <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={(c.name as string) || '목장'} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-heading">{c.name as string}</h3>
                    {c.region ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{c.region as string}</span>
                    ) : null}
                  </div>
                  {(c.leader_name || c.leader_role) ? (
                    <p className="mt-1 text-sm text-gray-600">
                      {[c.leader_role, c.leader_name].filter(Boolean).join(' ')}
                    </p>
                  ) : null}
                  {meeting ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-700">
                      <span aria-hidden>🕘</span> {meeting}
                    </p>
                  ) : null}
                  {c.location ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
                      <span aria-hidden>📍</span> {c.location as string}
                    </p>
                  ) : null}
                  {c.description ? (
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-500">{c.description as string}</p>
                  ) : null}
                  {c.contact ? (
                    <p className="mt-3 text-sm text-gray-400">{c.contact as string}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DataSection>
  );
}
