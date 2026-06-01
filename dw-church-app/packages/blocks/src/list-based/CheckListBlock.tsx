/**
 * Checklist block.
 * Per web-block-patterns-reference §2.6:
 *  - <ul> + <li> with check / arrow / dot icon variants
 *  - Optional 2-column layout for long lists
 *  - 12-16px between items, 20-24px icon
 *
 * Phase-2 element-composition refactor: title + per-item text/description
 * delegated to HeadingElement / TextBodyElement modules. The block shell
 * holds only structural concerns (grid columns, icon glyph dispatch, list
 * gap). No hardcoded copy fallbacks, no inner mx-auto/max-w cap on the
 * content (outer section envelope kept), no Tailwind text-* color classes
 * on text elements — operator props + brand tokens own those decisions.
 */

import { HeadingElement, TextBodyElement } from '../elements';

interface CheckListBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface CheckItem {
  text: string;
  description?: string;
}

export function CheckListBlock({ props }: CheckListBlockProps) {
  const title = (props.title as string) || '';
  // Support items as array of strings or array of {text}
  const rawItems = Array.isArray(props.items) ? props.items : [];
  const items: CheckItem[] = rawItems.map((it) =>
    typeof it === 'string' ? { text: it } : (it as CheckItem),
  );
  const columns = ((props.columns as string) ?? '1') as '1' | '2';
  const iconStyle = ((props.iconStyle as string) ?? 'check') as 'check' | 'arrow' | 'dot';

  if (items.length === 0) return null;

  const colsClass = columns === '2' ? 'sm:grid-cols-2' : '';

  return (
    <section style={{ paddingBlock: 'var(--section-py-md)' }}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h2"
          className="mb-8"
        />

        <ul className={`grid grid-cols-1 ${colsClass} gap-x-8 gap-y-3 list-none p-0`}>
          {items.map((it, i) => (
            <li key={i} className="grid items-start gap-3" style={{ gridTemplateColumns: '1.5rem 1fr' }}>
              <span style={{ marginTop: '0.125rem', color: 'var(--success)' }} aria-hidden="true">
                <Icon style={iconStyle} />
              </span>
              <div>
                <TextBodyElement
                  text={it.text}
                  props={props}
                  elementKey={`items[${i}].text`}
                  defaultTag="span"
                  defaultSize="body"
                />
                <TextBodyElement
                  text={it.description || ''}
                  props={props}
                  elementKey={`items[${i}].description`}
                  defaultTag="p"
                  defaultSize="caption"
                  className="mt-1"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Icon({ style }: { style: 'check' | 'arrow' | 'dot' }) {
  if (style === 'arrow') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 10h10M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (style === 'dot') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <circle cx="10" cy="10" r="3" />
      </svg>
    );
  }
  // check (default)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
