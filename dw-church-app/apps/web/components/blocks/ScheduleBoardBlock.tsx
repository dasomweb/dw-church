import { getSchedules } from '@/lib/api';

interface ScheduleBoardBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface ScheduleGroup {
  title?: string;
  columns?: string[];
  rows?: string[][];
}

// 예배 및 모임 Data Block. Fetches the tenant's `schedules` (each row = one
// titled group { title, columns, rows }) and renders an image + one titled
// table per group. The markup is INLINED (not imported from
// packages/blocks/ScheduleSplitBlock) so this async Server Component doesn't
// pull the blocks barrel (which can drag in client-only code).
export async function ScheduleBoardBlock({ props, slug }: ScheduleBoardBlockProps) {
  const imageUrl = (props.imageUrl as string) || '';
  // imagePosition field (좌측/우측/없음) is the primary control; the tenant
  // editor's variant buttons (image-left/image-right/no-image) are honored as
  // a fallback so either control works.
  const variant = (props.variant as string) || '';
  const imagePosition = (props.imagePosition as string)
    || (variant === 'image-right' ? 'right' : variant === 'no-image' ? 'none' : 'left');
  const showImage = imagePosition !== 'none' && !!imageUrl;
  const imageRight = imagePosition === 'right';

  let groups: ScheduleGroup[] = [];
  try {
    const data = await getSchedules(slug);
    groups = (Array.isArray(data) ? data : []).map((g: any) => ({
      title: g.title ?? '',
      columns: Array.isArray(g.columns) ? g.columns : ['예배', '시간', '장소'],
      rows: Array.isArray(g.rows) ? g.rows : [],
    }));
  } catch {
    groups = [];
  }

  // Keep only groups that have content (a title or at least one row).
  groups = groups.filter((g) => (g.rows?.length ?? 0) > 0 || (g.title ?? '').trim().length > 0);

  // Nothing registered yet — render nothing rather than an empty frame.
  if (groups.length === 0) return null;

  const imageCol = showImage ? (
    <div style={{ flex: '0 0 38%', minWidth: 0 }} className="w-full md:w-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={(props.imageAlt as string) || '예배 사진'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 'var(--brand-radius-lg, 12px)',
          aspectRatio: '3 / 4',
        }}
      />
    </div>
  ) : null;

  const tablesCol = (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title ? (
            <h3
              style={{
                fontSize: 'var(--brand-h4-size, 1.25rem)',
                fontWeight: 700,
                color: gi === 0 ? 'var(--brand-primary, var(--dw-primary, #b45309))' : 'var(--text, #1f2937)',
                marginBottom: '0.75rem',
              }}
            >
              {g.title}
            </h3>
          ) : null}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm, 0.95rem)' }}>
              {g.columns && g.columns.length > 0 ? (
                <thead>
                  <tr>
                    {g.columns.map((c, ci) => (
                      <th
                        key={ci}
                        style={{
                          textAlign: 'left',
                          fontWeight: 600,
                          color: 'var(--text, #374151)',
                          padding: '0.6rem 0.75rem',
                          borderBottom: '1px solid var(--border, rgba(0,0,0,0.12))',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {(g.rows ?? []).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
                          color: 'var(--text, #374151)',
                          verticalAlign: 'top',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="px-4 sm:px-6" style={{ paddingBlock: 'var(--section-py-md)' }}>
      <div className="mx-auto max-w-7xl">
        <div
          style={{
            display: 'flex',
            flexDirection: imageRight ? 'row-reverse' : 'row',
            gap: '2.5rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
          className="schedule-board"
        >
          {imageCol}
          {tablesCol}
        </div>
      </div>
    </section>
  );
}
