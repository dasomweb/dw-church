import { ImageElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

interface ScheduleSplitBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

interface ScheduleGroup {
  title?: string;
  columns?: string[];
  rows?: string[][];
}

/**
 * Schedule split — a tall image on the LEFT and one or more titled SCHEDULE
 * TABLES on the RIGHT. Mirrors the koreanunity.org worship page (sanctuary
 * photo + 주일예배 / 교육부 예배 / 주중예배 / 주중모임 tables). Each group has a
 * heading, column headers, and rows. Reverse columns with
 * props.imagePosition='right'.
 */
export function ScheduleSplitBlock({ props }: ScheduleSplitBlockProps) {
  const imageUrl = (props.imageUrl as string) || (props.image as string) || '';
  const rawGroups = Array.isArray(props.groups) ? (props.groups as ScheduleGroup[]) : [];
  const groups = rawGroups.filter((g) => (g.rows?.length ?? 0) > 0 || (g.title ?? '').trim().length > 0);
  const imageRight = ((props.imagePosition as string) || '') === 'right';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  const imageCol = (
    <div style={{ flex: '0 0 38%', minWidth: 0 }} className="w-full md:w-auto">
      <ImageElement
        url={imageUrl}
        alt={(props.imageAlt as string) || ''}
        props={props}
        elementKey="imageUrl"
        sizeCategory="split-side"
        baseStyle={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 'var(--brand-radius-lg, 12px)',
          aspectRatio: '3 / 4',
        }}
        placeholderText="예배 사진"
      />
    </div>
  );

  const tablesCol = (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title ? (
            <h3
              data-element={`groups[${gi}].title`}
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
    <SectionShell
      props={props}
      className={`${sectionBg.className} px-4 sm:px-6`.trim()}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: imageRight ? 'row-reverse' : 'row',
          gap: '2.5rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
        className="schedule-split"
      >
        {imageCol}
        {tablesCol}
      </div>
    </SectionShell>
  );
}
