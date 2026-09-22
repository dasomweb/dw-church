import type { CSSProperties } from 'react';
import { HeadingElement, TextBodyElement, EyebrowElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';
import { SectionHeadingRule } from '../utilities/SectionHeadingRule';

interface ValuesGridBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

interface ValueItem {
  /** Small uppercase eyebrow above the card title (e.g. WALKING WITH JESUS). */
  overline?: string;
  title?: string;
  /** Card body copy. `body` or legacy `description`. */
  description?: string;
  body?: string;
  /** Optional link — when set the whole card becomes a link to a detail page. */
  href?: string;
  /** Link text shown at the bottom of a linked card (default '자세히 ›'). */
  linkLabel?: string;
}

/**
 * Values / core-principles card grid — a ruled section heading followed by
 * N cards, each with an OVERLINE eyebrow + title + body. Distinct from
 * features_grid (icon/image cards): here every card leads with an eyebrow
 * label, matching the "핵심 가치" three-up. Token- + prop-driven; the column
 * count is honoured through the container-query grid (responsive without
 * dynamic Tailwind classes). Reusable on any tenant.
 */
export function ValuesGridBlock({ props }: ValuesGridBlockProps) {
  const title = (props.title as string) ?? '';
  const showRule = props.showRule !== false; // default true
  const columns = ((props.columns as string) ?? '3') as '2' | '3' | '4';
  const mobileColumns = ((props.mobileColumns as string) ?? '1') as '1' | '2';
  const items = (Array.isArray(props.items) ? props.items : []) as ValueItem[];
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  if (items.length === 0) return null;

  const cqVars = {
    '--cq-base': mobileColumns,
    '--cq-sm': '2',
    '--cq-lg': columns,
  } as CSSProperties;

  const cardStyle: CSSProperties = {
    background: 'var(--dw-surface, var(--surface, #f7f8fa))',
    border: '1px solid var(--border, rgba(0,0,0,0.06))',
    borderRadius: 'var(--r-lg, var(--brand-radius-lg, 16px))',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  };

  return (
    <SectionShell
      props={props}
      className={`b2b-cq-host ${sectionBg.className}`.trim()}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 2.25rem)' }}>
        <SectionHeadingRule props={props} title={title} showRule={showRule} />
        <ul className="b2b-cq-grid list-none p-0 m-0" style={cqVars}>
          {items.map((it, i) => {
            const inner = (
              <>
                <EyebrowElement
                  text={it.overline || ''}
                  props={props}
                  elementKey={`items[${i}].overline`}
                />
                <HeadingElement
                  text={it.title || ''}
                  props={props}
                  elementKey={`items[${i}].title`}
                  defaultTag="h3"
                  defaultSize="h4"
                />
                <TextBodyElement
                  text={it.body || it.description || ''}
                  props={props}
                  elementKey={`items[${i}].description`}
                  defaultTag="div"
                  defaultSize="body"
                  html
                  baseStyle={{ color: 'var(--brand-muted, var(--text-muted, #6b7280))' }}
                />
                {it.href && (
                  <span style={{ marginTop: 'auto', paddingTop: '0.5rem', color: 'var(--dw-primary, var(--accent, currentColor))', fontWeight: 600, fontSize: '0.9rem' }}>
                    {it.linkLabel || '자세히'} ›
                  </span>
                )}
              </>
            );
            // href 있으면 카드 전체가 상세 페이지로 가는 링크가 된다(제목 포함). 없으면 정적 카드.
            return (
              <li key={i} style={cardStyle} className={it.href ? 'hover:-translate-y-0.5 transition-transform' : undefined}>
                {it.href ? (
                  <a href={it.href} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', height: '100%', color: 'inherit', textDecoration: 'none' }}>
                    {inner}
                  </a>
                ) : inner}
              </li>
            );
          })}
        </ul>
      </div>
    </SectionShell>
  );
}
