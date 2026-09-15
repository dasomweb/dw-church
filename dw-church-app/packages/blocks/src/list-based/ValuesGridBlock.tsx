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
          {items.map((it, i) => (
            <li key={i} style={cardStyle}>
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
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
