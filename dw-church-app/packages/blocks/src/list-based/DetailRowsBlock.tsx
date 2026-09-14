import type { CSSProperties } from 'react';
import { HeadingElement, TextBodyElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';
import { SectionHeadingRule } from '../utilities/SectionHeadingRule';

interface DetailRowsBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

interface DetailRow {
  /** Left column bold title. */
  title?: string;
  /** Left column small label under the title (e.g. 예배 공동체). */
  label?: string;
  /** Right column description paragraph. */
  description?: string;
  /** Right column small muted meta line (e.g. 회중예배 — 새벽·수요·주일). */
  meta?: string;
}

/**
 * Detail rows — a ruled section heading + optional intro, then a vertical
 * list of rows. Each row is two columns: LEFT = bold title + small label,
 * RIGHT = description paragraph + a muted meta line. Matches the "목회 방향"
 * definition-list layout. Rows stack on mobile via flex-wrap (no dynamic
 * classes). Token- + prop-driven; reusable on any tenant.
 */
export function DetailRowsBlock({ props }: DetailRowsBlockProps) {
  const title = (props.title as string) ?? '';
  const intro = (props.intro as string) ?? '';
  const showRule = props.showRule !== false; // default true
  const items = (Array.isArray(props.items) ? props.items : []) as DetailRow[];
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  if (!title && !intro && items.length === 0) return null;

  const rowStyle: CSSProperties = {
    background: 'var(--dw-surface, var(--surface, #f7f8fa))',
    border: '1px solid var(--border, rgba(0,0,0,0.06))',
    borderRadius: 'var(--r-lg, var(--brand-radius-lg, 16px))',
    padding: '1.5rem 1.75rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem 2.5rem',
    alignItems: 'baseline',
  };
  const leftColStyle: CSSProperties = { flex: '1 1 220px', minWidth: '180px' };
  const rightColStyle: CSSProperties = { flex: '3 1 320px', minWidth: 0 };
  const metaStyle: CSSProperties = { color: 'var(--brand-muted, var(--text-muted, #9ca3af))', marginTop: '0.6rem' };
  const labelStyle: CSSProperties = { color: 'var(--brand-muted, var(--text-muted, #9ca3af))', marginTop: '0.35rem' };

  return (
    <SectionShell
      props={props}
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 2rem)' }}>
        <SectionHeadingRule props={props} title={title} intro={intro} showRule={showRule} />
        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {items.map((it, i) => (
              <div key={i} style={rowStyle}>
                <div style={leftColStyle}>
                  <HeadingElement
                    text={it.title || ''}
                    props={props}
                    elementKey={`items[${i}].title`}
                    defaultTag="h3"
                    defaultSize="h4"
                  />
                  <TextBodyElement
                    text={it.label || ''}
                    props={props}
                    elementKey={`items[${i}].label`}
                    defaultTag="p"
                    defaultSize="caption"
                    baseStyle={labelStyle}
                  />
                </div>
                <div style={rightColStyle}>
                  <TextBodyElement
                    text={it.description || ''}
                    props={props}
                    elementKey={`items[${i}].description`}
                    defaultTag="div"
                    defaultSize="body"
                    html
                  />
                  <TextBodyElement
                    text={it.meta || ''}
                    props={props}
                    elementKey={`items[${i}].meta`}
                    defaultTag="p"
                    defaultSize="caption"
                    baseStyle={metaStyle}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
