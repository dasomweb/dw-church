/**
 * Vertical timeline — a sequence of dated milestones. Different from
 * steps_list (numbered process) and from check_list (untimed bullets):
 * timeline emphasises *when* each milestone occurred, anchored on a
 * left rail with a labeled dot for each entry. Common B2B uses:
 *
 *   "Our Story"   — company history (2018: founded → 2024: Series B)
 *   "Roadmap"     — public-facing product milestones
 *   "Process"     — multi-week onboarding stages with target dates
 *
 * Items take `{ date, title, description, badge? }`. `date` renders
 * larger and in the accent color so the eye scans the rail by year/
 * quarter; `badge` (optional) is a small status pill (e.g. "완료",
 * "진행 중") for roadmap-style use.
 *
 * Variants:
 *   left   — rail on the left, content right (default; reads naturally
 *            in LTR languages)
 *   center — alternating sides around a centered rail (history-page
 *            classic; visually denser on desktop)
 *
 * Phase-2 element-composition refactor: title / subtitle + per-event
 * date / title / description delegated to element modules so the
 * operator's theme + inspector overrides flow through. The rail dot
 * and badge pill stay inline because they are intrinsic variant
 * decorations, not generic body copy.
 */

import { HeadingElement, TextBodyElement } from '../elements';

interface TimelineBlockProps {
  props: Record<string, unknown>;
}

type Variant = 'left' | 'center';

const BG_CLASS: Record<string, string> = {
  none: 'bg-white',
  subtle: 'bg-[var(--dw-surface,#f9fafb)]',
};

export function TimelineBlock({ props }: TimelineBlockProps) {
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const variant = ((props.variant as string) === 'center' ? 'center' : 'left') as Variant;
  const bgMode = (props.bgMode as string) || 'none';
  const bgClass = BG_CLASS[bgMode] || BG_CLASS.none;
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];

  return (
    <section className={`px-4 sm:px-6 py-16 sm:py-24 ${bgClass}`}>
      <div className="mx-auto max-w-5xl">
        {(title || subtitle) && (
          <header className="mb-8 sm:mb-12 text-center">
            <HeadingElement
              text={title}
              props={props}
              elementKey="title"
              defaultTag="h2"
              defaultSize="h2"
            />
            <HeadingElement
              text={subtitle}
              props={props}
              elementKey="subtitle"
              defaultTag="h5"
              defaultSize="h3"
            />
          </header>
        )}
        {variant === 'center' ? (
          <CenterRail items={items} parentProps={props} />
        ) : (
          <LeftRail items={items} parentProps={props} />
        )}
      </div>
    </section>
  );
}

/* ─── left-rail variant (default) ──────────────────────────── */

function LeftRail({ items, parentProps }: { items: Array<Record<string, unknown>>; parentProps: Record<string, unknown> }) {
  return (
    <ol className="relative border-l-2 border-gray-200 pl-8 space-y-10">
      {items.map((item, idx) => (
        <li key={idx} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[37px] top-1 w-4 h-4 rounded-full bg-[var(--accent,var(--dw-primary))] border-4 border-white shadow"
          />
          <Entry item={item} idx={idx} parentProps={parentProps} />
        </li>
      ))}
    </ol>
  );
}

/* ─── center-rail variant (alternating sides) ──────────────── */

function CenterRail({ items, parentProps }: { items: Array<Record<string, unknown>>; parentProps: Record<string, unknown> }) {
  return (
    <ol className="relative">
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-0.5 bg-gray-200 hidden md:block"
      />
      <div className="space-y-10 md:space-y-14">
        {items.map((item, idx) => {
          const onLeft = idx % 2 === 0;
          return (
            <li
              key={idx}
              className={`md:grid md:grid-cols-2 md:gap-12 relative ${onLeft ? '' : 'md:[&>*:first-child]:order-2'}`}
            >
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-2 -translate-x-1/2 w-4 h-4 rounded-full bg-[var(--accent,var(--dw-primary))] border-4 border-white shadow hidden md:block"
              />
              <div className={`md:px-6 ${onLeft ? 'md:text-right' : 'md:text-left'}`}>
                <Entry item={item} idx={idx} parentProps={parentProps} />
              </div>
              <div aria-hidden="true" />
            </li>
          );
        })}
      </div>
    </ol>
  );
}

/* ─── shared entry rendering ───────────────────────────────── */

function Entry({
  item,
  idx,
  parentProps,
}: {
  item: Record<string, unknown>;
  idx: number;
  parentProps: Record<string, unknown>;
}) {
  const date = (item.date as string) || '';
  const title = (item.title as string) || '';
  const description = (item.description as string) || '';
  const badge = (item.badge as string) || '';

  return (
    <div data-element={`items[${idx}]`}>
      <HeadingElement
        text={date}
        props={parentProps}
        elementKey={`items[${idx}].date`}
        defaultTag="div"
        defaultSize="label"
        baseStyle={{ marginBottom: '0.25rem' }}
      />
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <HeadingElement
          text={title}
          props={parentProps}
          elementKey={`items[${idx}].title`}
          defaultTag="h3"
          defaultSize="h4"
        />
        {badge && (
          <span
            data-element={`items[${idx}].badge`}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-gray-100 text-gray-700"
          >
            {badge}
          </span>
        )}
      </div>
      <TextBodyElement
        text={description}
        props={parentProps}
        elementKey={`items[${idx}].description`}
        defaultTag="p"
        defaultSize="body"
      />
    </div>
  );
}
