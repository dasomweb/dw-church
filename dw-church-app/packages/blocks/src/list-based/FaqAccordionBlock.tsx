/**
 * FAQ accordion block.
 * Per web-block-patterns-reference §2.9:
 *  - Built on <details><summary> — works without JS, keyboard-accessible
 *    out of the box, screen readers announce expand/collapse natively.
 *  - Chevron rotates via [open] state attribute, no JS state required.
 *  - Default-marker hidden via list-style: none + ::-webkit-details-marker.
 *  - Optional 2-column layout for 8+ items (§2.9 variant table).
 *
 * Phase-2 element-composition refactor: eyebrow / title / subtitle and
 * per-item question / answer delegated to EyebrowElement / HeadingElement
 * / TextBodyElement. Accordion expand state (<details open>) stays — that
 * is this block's interactive identity, not generic typography.
 */
import { HeadingElement, TextBodyElement, EyebrowElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

interface FaqAccordionBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordionBlock({ props }: FaqAccordionBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const items = (Array.isArray(props.items) ? props.items : []) as FaqItem[];
  const columns = ((props.columns as string) ?? '1') as '1' | '2';
  // defaultOpen — number: 0+ = 그 인덱스만 open, -1 = 모두 닫힘, 'all' =
  // 모두 열림 (대표님 2026-05-27).
  const defaultOpenRaw = props.defaultOpen;
  const allOpen = defaultOpenRaw === 'all' || defaultOpenRaw === -999;
  const defaultOpen = typeof defaultOpenRaw === 'number' ? defaultOpenRaw : -1;
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  if (items.length === 0) return null;

  const colsClass = columns === '2' ? 'sm:grid-cols-2' : '';

  return (
    <SectionShell
      props={props}
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-4xl px-4 sm:px-6"
    >
      <div>
        {(eyebrow || title || subtitle) && (
          <header className="mb-8 sm:mb-10 text-center">
            <EyebrowElement
              text={eyebrow}
              props={props}
              elementKey="eyebrow"
              className="mb-5"
            />
            <HeadingElement
              text={title}
              props={props}
              elementKey="title"
              defaultTag="h2"
              defaultSize="h2"
            />
            <TextBodyElement
              text={subtitle}
              props={props}
              elementKey="subtitle"
              defaultTag="p"
              defaultSize="h3"
              className="mt-3"
            />
          </header>
        )}

        <div className={`grid grid-cols-1 ${colsClass} gap-x-8 gap-y-0`}>
          {items.map((it, i) => (
            <details
              key={i}
              open={allOpen || i === defaultOpen}
              className="group"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <summary
                className="flex items-center justify-between cursor-pointer list-none"
                style={{ paddingBlock: '1.25rem' }}
              >
                <HeadingElement
                  text={it.question}
                  props={props}
                  elementKey={`items[${i}].question`}
                  defaultTag="span"
                  defaultSize="h5"
                />
                <svg
                  className="shrink-0 transition-transform group-open:rotate-180"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <TextBodyElement
                text={it.answer}
                props={props}
                elementKey={`items[${i}].answer`}
                defaultTag="div"
                defaultSize="body"
                html
                baseStyle={{ paddingBottom: '1.25rem' }}
              />
            </details>
          ))}
        </div>
      </div>

    </SectionShell>
  );
}
