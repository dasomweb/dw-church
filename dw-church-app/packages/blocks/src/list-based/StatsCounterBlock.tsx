'use client';

import { useEffect, useRef, useState } from 'react';
import { HeadingElement, EyebrowElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

/**
 * Stats / Counter block — N column grid of (value, label) pairs.
 *
 * Per web-block-patterns-reference §2.7:
 *  - Number font is 40-80px clamp (--fs-display)
 *  - tabular-nums so widths align across rows
 *  - Label is muted small caption text
 *  - Optional `unit` (% / + / yrs) and `prefix` ($ / ~)
 *  - Numeric values count up from 0 once the section enters the viewport.
 *    Non-numeric values (e.g. "$5M", "24/7") render immediately.
 *  - `prefers-reduced-motion: reduce` → final value shown instantly.
 *
 * Phase-2 element-composition refactor: title / subtitle / per-cell value
 * and label delegated to HeadingElement modules so the operator's theme
 * typography panel + inspector overrides flow uniformly. Counter
 * animation logic stays — the animated number is rendered as the
 * HeadingElement's text content (it re-renders on each rAF tick).
 */
interface StatsCounterBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface StatItem {
  // The editor (and earlier AI builder iterations) sometimes wrote
  // `number` instead of `value`. Accept both — value wins, number is
  // the back-compat fallback. Without this, items written by the
  // editor's stats form rendered nothing on the storefront because
  // each cell hit `undefined.replace(...)` on its first render.
  value?: string;
  number?: string;
  label?: string;
  unit?: string;
  prefix?: string;
}

export function StatsCounterBlock({ props }: StatsCounterBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const columns = ((props.columns as string) ?? '3') as '2' | '3' | '4';
  // Drop items with no usable value/number — protects StatCell from
  // calling .replace on undefined when the editor saved a half-finished
  // entry, and skips placeholder rows entirely.
  const rawItems = (Array.isArray(props.items) ? props.items : []) as StatItem[];
  const items = rawItems
    .map((it) => ({ ...it, value: it.value ?? it.number ?? '' }))
    .filter((it) => (it.value ?? '').length > 0 || (it.label ?? '').length > 0);
  const align = ((props.align as string) ?? 'center') as 'left' | 'center' | 'right';
  // 'dark' added — Russian RE site puts the stat row on a near-black
  // section to break up two pale areas above + below.
  const bgMode = ((props.bgMode as string) ?? 'none') as 'none' | 'subtle' | 'accent' | 'dark';

  if (items.length === 0) return null;

  const colsClass =
    columns === '4'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : columns === '2'
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  const bgClass = sectionBg.className;

  return (
    <SectionShell
      props={props}
      className={bgClass}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div>
        {(eyebrow || title || subtitle) && (
          <header className={`mb-8 sm:mb-12 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}`}>
            {eyebrow && (
              <EyebrowElement
                text={eyebrow}
                props={props}
                elementKey="eyebrow"
                className="mb-3"
              />
            )}
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

        <dl className={`grid grid-cols-1 ${colsClass} gap-6 sm:gap-8 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}`}>
          {items.map((item, i) => (
            <StatCell
              key={i}
              index={i}
              item={item}
              parentProps={props}
            />
          ))}
        </dl>
      </div>
    </SectionShell>
  );
}

/* ─── single cell with count-up animation ─────────────────── */

function StatCell({
  index,
  item,
  parentProps,
}: {
  index: number;
  item: StatItem;
  /**
   * Section-level props.elementStyles[`items[${index}].value`] is where
   * the inspector writes per-cell overrides (font size, weight, color,
   * etc). Without threading parentProps in here, the cell rendered at
   * its hardcoded baseline forever — operator edits saved to the row
   * but didn't visually take effect.
   */
  parentProps: Record<string, unknown>;
}) {
  // The parent component normalises value↔number, but defend against
  // missing strings here too so a malformed item doesn't crash the page.
  const valueStr = item.value ?? item.number ?? '';
  // Try to parse the numeric portion of `value`. Strings like "12,400",
  // "99.9", "5", "12k" are converted to a number and animated. Strings
  // like "24/7", "A+", "Best in class" stay literal.
  const numericMatch = valueStr.replace(/,/g, '').match(/^-?(\d+(\.\d+)?)([kKmMbB]?)$/);
  const target = numericMatch ? parseFloat(numericMatch[1]!) : null;
  const suffixLetter = numericMatch?.[3] || '';

  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<string>(target == null ? valueStr : '0');

  useEffect(() => {
    if (target == null) return;

    // Honour reduced-motion preference.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(formatNumber(target, valueStr, suffixLetter));
      return;
    }

    const node = ref.current;
    if (!node) return;

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // ease-out-cubic
          const eased = 1 - Math.pow(1 - t, 3);
          const current = target * eased;
          setShown(formatNumber(current, valueStr, suffixLetter, t < 1));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, suffixLetter, valueStr]);

  // The value composes prefix / shown digits / unit into a single string
  // so HeadingElement can render it through one stable data-element key.
  // tabular-nums + nowrap come through baseStyle to keep the visual
  // alignment behaviour from the pre-refactor version.
  const renderedValue = `${item.prefix ?? ''}${shown}${item.unit ?? ''}`;

  return (
    <div ref={ref} className="flex flex-col">
      <dd className="m-0" style={{ order: 1 }}>
        <HeadingElement
          text={renderedValue}
          props={parentProps}
          elementKey={`items[${index}].value`}
          defaultTag="span"
          defaultSize="h1"
          baseStyle={{
            display: 'inline-block',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        />
      </dd>
      <dt className="mt-2" style={{ order: 2 }}>
        <HeadingElement
          text={item.label ?? ''}
          props={parentProps}
          elementKey={`items[${index}].label`}
          defaultTag="span"
          defaultSize="caption"
          baseStyle={{ display: 'inline-block' }}
        />
      </dt>
    </div>
  );
}

/**
 * Reproduce the original value's formatting (commas, decimal places,
 * k/M/B suffix) on the animated number. Mid-flight we round to whole
 * numbers; on the final frame we restore decimals.
 */
function formatNumber(current: number, original: string, suffixLetter: string, midFlight = false): string {
  const hasComma = original.includes(',');
  const dotIdx = original.indexOf('.');
  const decimals = dotIdx >= 0 ? original.length - dotIdx - 1 - suffixLetter.length : 0;
  const value = midFlight ? Math.floor(current) : current;
  let str = decimals > 0 && !midFlight ? value.toFixed(decimals) : Math.floor(value).toString();
  if (hasComma) {
    const [whole, dec] = str.split('.');
    str = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? `.${dec}` : '');
  }
  return str + suffixLetter;
}
