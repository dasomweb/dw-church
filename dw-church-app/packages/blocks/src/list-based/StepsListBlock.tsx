import { HeadingElement, TextBodyElement, EyebrowElement } from '../elements';
import { mergeElementStyle } from '../utilities/element-styles';
import { sectionBgStyle } from '../utilities/section-bg';
import { Icon } from '../utilities/Icon';
import { ICONS } from '../icons/icons';

/**
 * Process / "How we work" steps list — the pattern that shows up on
 * almost every modern marketing site as "Как мы работаем", "Unser
 * Ablauf", "Our Process". A vertical or grid sequence of numbered
 * steps where each row carries an icon, a short title, and a 1-2 line
 * description.
 *
 * Phase-2 element-composition refactor: header (eyebrow / title /
 * subtitle), per-step title and description delegated to the reusable
 * element modules. The indicator (numbered circle, icon circle with
 * badge) keeps its inline styling because it's intrinsic to the step
 * variant, not generic body copy.
 */

interface StepsListBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

interface StepItem {
  title: string;
  description?: string;
  /** Lucide-style icon name; rendered as fallback glyph today, hook
   * for future icon registry. Falls back to imageUrl. */
  iconName?: string;
  /** Custom image inside the indicator circle (overrides iconName). */
  imageUrl?: string;
  /** Explicit override; falls back to 1-based index. */
  number?: string;
}

type Layout = 'vertical' | 'grid';
type Mode = 'icon' | 'number';

export function StepsListBlock({ props }: StepsListBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const rawItems = Array.isArray(props.items) ? props.items : [];
  const items: StepItem[] = rawItems
    .map((it) => (typeof it === 'string' ? { title: it } : (it as StepItem)))
    .filter((it) => (it.title ?? '').trim().length > 0);

  const layout = ((props.layout as string) ?? 'vertical') as Layout;
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  // Auto-select indicator mode: any item has an icon → 'icon', else 'number'.
  const explicitMode = props.indicatorMode as string | undefined;
  const hasAnyIcon = items.some((it) => it.iconName || it.imageUrl);
  const mode: Mode = (explicitMode === 'icon' || explicitMode === 'number')
    ? explicitMode
    : hasAnyIcon
      ? 'icon'
      : 'number';

  if (items.length === 0) return null;

  return (
    <section
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-md, 4rem)', ...sectionBg.style }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {(eyebrow || title || subtitle) && (
          <header className="mb-10 sm:mb-14">
            <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
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

        {layout === 'grid' ? (
          <ol
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 list-none p-0 m-0"
          >
            {items.map((it, i) => (
              <GridStep
                key={i}
                index={i}
                item={it}
                mode={mode}
                bgMode={bgMode}
                parentProps={props}
              />
            ))}
          </ol>
        ) : (
          <ol className="list-none p-0 m-0 divide-y" style={{ borderColor: 'var(--border, rgba(0,0,0,0.08))' }}>
            {items.map((it, i) => (
              <VerticalStep
                key={i}
                index={i}
                item={it}
                mode={mode}
                bgMode={bgMode}
                parentProps={props}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/* ─── vertical row (default — Russian RE / Stanislav) ─────── */

function VerticalStep({
  index,
  item,
  mode,
  bgMode,
  parentProps,
}: {
  index: number;
  item: StepItem;
  mode: Mode;
  bgMode: string;
  parentProps: Record<string, unknown>;
}) {
  return (
    <li className="grid gap-5 sm:gap-8 py-6 sm:py-8 items-start" style={{ gridTemplateColumns: 'auto 1fr' }}>
      <Indicator index={index} item={item} mode={mode} size={56} bgMode={bgMode} parentProps={parentProps} />
      <div className="min-w-0">
        <HeadingElement
          text={item.title}
          props={parentProps}
          elementKey={`items[${index}].title`}
          defaultTag="h3"
          defaultSize="h4"
        />
        <TextBodyElement
          text={item.description ?? ''}
          props={parentProps}
          elementKey={`items[${index}].description`}
          defaultTag="p"
          defaultSize="body"
          className="mt-2"
        />
      </div>
    </li>
  );
}

/* ─── grid cell (3-up overview) ───────────────────────────── */

function GridStep({
  index,
  item,
  mode,
  bgMode,
  parentProps,
}: {
  index: number;
  item: StepItem;
  mode: Mode;
  bgMode: string;
  parentProps: Record<string, unknown>;
}) {
  return (
    <li>
      <Indicator index={index} item={item} mode={mode} size={64} bgMode={bgMode} parentProps={parentProps} />
      <HeadingElement
        text={item.title}
        props={parentProps}
        elementKey={`items[${index}].title`}
        defaultTag="h3"
        defaultSize="h4"
        className="mt-5"
      />
      <TextBodyElement
        text={item.description ?? ''}
        props={parentProps}
        elementKey={`items[${index}].description`}
        defaultTag="p"
        defaultSize="body"
        className="mt-2"
      />
    </li>
  );
}

/* ─── the indicator circle ────────────────────────────────── */

function Indicator({
  index,
  item,
  mode,
  size,
  bgMode,
  parentProps,
}: {
  index: number;
  item: StepItem;
  mode: Mode;
  size: number;
  bgMode: string;
  parentProps: Record<string, unknown>;
}) {
  const onDark = bgMode === 'dark' || bgMode === 'accent';
  const stepNumber = item.number?.trim() || String(index + 1).padStart(2, '0');

  // 'number' mode: just the big numerals.
  if (mode === 'number') {
    return (
      <div
        aria-hidden="true"
        className="rounded-full font-bold flex items-center justify-center shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: onDark ? 'rgba(255, 255, 255, 0.10)' : 'var(--accent-soft, rgba(0,0,0,0.05))',
          color: onDark ? '#fff' : 'var(--accent, var(--dw-primary, #059669))',
          fontSize: size >= 64 ? '1.25rem' : '1rem',
          letterSpacing: '-0.02em',
        }}
      >
        {stepNumber}
      </div>
    );
  }

  // 'icon' mode: icon circle + small number badge top-right.
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="rounded-full flex items-center justify-center w-full h-full overflow-hidden"
        style={{
          backgroundColor: onDark ? 'rgba(255, 255, 255, 0.10)' : 'var(--accent-soft, rgba(0,0,0,0.05))',
          color: onDark ? '#fff' : 'var(--accent, var(--dw-primary, #059669))',
        }}
      >
        {item.imageUrl ? (
          <img
            data-element={`items[${index}].imageUrl`}
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-1/2 h-1/2 object-contain"
            style={mergeElementStyle({}, parentProps, `items[${index}].imageUrl`)}
          />
        ) : item.iconName && ICONS[item.iconName] ? (
          <Icon
            name={item.iconName}
            size={Math.round(size * 0.5)}
            data-element={`items[${index}].iconName`}
          />
        ) : (
          <DefaultStepGlyph size={Math.round(size * 0.45)} />
        )}
      </div>
      {/* numbered badge top-right */}
      <span
        className="absolute -top-1 -right-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
        style={{
          backgroundColor: onDark ? '#fff' : 'var(--accent, var(--dw-primary, #059669))',
          color: onDark ? 'var(--accent, var(--dw-primary, #059669))' : '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      >
        {index + 1}
      </span>
    </div>
  );
}

function DefaultStepGlyph({ size = 24 }: { size?: number }) {
  // Generic "step" glyph — checkmark in a circle. Operator can override
  // with imageUrl for a per-step illustrated icon.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
