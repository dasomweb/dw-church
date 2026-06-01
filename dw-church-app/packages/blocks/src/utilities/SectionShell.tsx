/**
 * SectionShell — outer wrapper for any section block that wants the
 * unified background image / overlay / border treatment.
 *
 * Replaces the ~15-line copy-paste block (SectionBackground render +
 * relative wrapper + border style + overflow-hidden) that TextImage /
 * TextOnly / FeaturesGrid / Testimonials already use individually. Lets
 * the remaining section blocks (Video / Pricing / Team / Logo / FAQ /
 * Map / StatsCounter / etc.) pick up the same behavior with one wrapper
 * component instead of repeating 15 lines per block.
 *
 * Usage:
 *
 *   <SectionShell
 *     props={props}
 *     className="b2b-cq-host bg-white"
 *     style={{ paddingBlock: 'var(--section-py-md)' }}
 *   >
 *     <div className="mx-auto max-w-7xl px-4 sm:px-6">
 *       (page content here)
 *     </div>
 *   </SectionShell>
 *
 * Children are wrapped in a `relative z-10` div so they always render
 * above the absolute background layer. The shell itself stays
 * `position: relative` + `overflow: hidden` whenever there's a
 * background or border to clip.
 */

import type { CSSProperties, ReactNode } from 'react';
import { SectionBackground } from '../elements';
import {
  readOverlayProps,
  readBackgroundPosition,
  hasSectionBackground,
  buildSectionBorderStyle,
  resolveSectionWidth,
  resolveContentWidth,
  contentWidthClass,
  SECTION_HEIGHT_MAP,
  SECTION_ALIGN_MAP,
} from './section-shell';

export interface SectionShellProps {
  /** Operator's section props bag — must contain backgroundImageUrl /
   *  overlay* / border* / backgroundImagePosition when those features
   *  are wanted. */
  props: Record<string, unknown>;
  /** className for the outer <section>. Caller's class wins; the shell
   *  adds `relative` + `overflow-hidden` when bg/border present. */
  className?: string;
  /** Inline style for the outer <section>. Border style is appended
   *  automatically; caller's style takes priority elsewhere. */
  style?: CSSProperties;
  /** Tag override — defaults to <section>. Use 'div' or 'article' if
   *  semantics call for it. */
  as?: 'section' | 'div' | 'article';
  /** Wrapped page content. Always rendered inside a `relative z-10`
   *  div so it sits above the absolute SectionBackground layer. */
  children: ReactNode;
  /** SectionBackground sizeCategory — passed to ImageElement for the
   *  responsive srcset slot. Default 'hero-bg' (full-bleed). Use
   *  'split-side' for half-width sections. */
  sizeCategory?: 'hero-bg' | 'split-side';
  /** When true, the shell honors operator's `height` / `textAlign` /
   *  `width` / `contentWidth` props the same way HeroBanner does — so
   *  every section block inherits the HERO_BANNER inspector vocabulary
   *  uniformly. Blocks that already manage their own width/height
   *  (split layouts, gallery grids) opt out by leaving this false and
   *  rendering their own container. */
  applyLayout?: boolean;
  /** Default content wrapper class when applyLayout is true and the
   *  operator didn't pick a specific contentWidth. Most section blocks
   *  use mx-auto max-w-7xl px-4 sm:px-6; pass overrides only when the
   *  block needs a tighter / wider default (e.g. quote = max-w-4xl). */
  defaultContentClass?: string;
}

export function SectionShell({
  props,
  className,
  style,
  as: Tag = 'section',
  children,
  sizeCategory = 'hero-bg',
  applyLayout = false,
  defaultContentClass = 'mx-auto max-w-7xl px-4 sm:px-6',
}: SectionShellProps) {
  const hasBg = hasSectionBackground(props);
  const overlay = readOverlayProps(props);
  const bgPosition = readBackgroundPosition(props);
  const borderStyle = buildSectionBorderStyle(props);
  const hasBorder = Object.keys(borderStyle).length > 0;
  const needsClip = hasBg || hasBorder;

  // Layout knobs from the operator's LayoutField (HERO_BANNER vocab).
  // Only applied when applyLayout=true so blocks with custom layouts
  // (split-image, gallery grids) aren't forced into the hero-style box.
  let outerHeightClass = '';
  let outerWidthClass = '';
  let innerWidthClass = '';
  let textAlignClass = '';
  if (applyLayout) {
    const height = (props.height as string) || '';
    const width = resolveSectionWidth(props);
    const contentWidth = resolveContentWidth(props);
    const textAlign = (props.textAlign as string) || (props.align as string) || '';
    outerHeightClass = SECTION_HEIGHT_MAP[height] ?? '';
    // outer width: contained = mx-auto max-w-7xl rounded-3xl (matches Hero)
    // full-bleed (default) = no wrapper, section extends edge-to-edge.
    outerWidthClass = width === 'contained' ? 'mx-auto max-w-7xl rounded-3xl' : '';
    // inner content wrapper width — independent of outer (text stays
    // contained even when background is full-bleed).
    innerWidthClass = contentWidthClass(contentWidth);
    textAlignClass = SECTION_ALIGN_MAP[textAlign] ?? '';
  }

  const mergedClass = [
    needsClip ? 'relative overflow-hidden' : '',
    outerWidthClass,
    outerHeightClass,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const mergedStyle: CSSProperties = { ...(style ?? {}), ...borderStyle };

  // Inner content wrapper class — applyLayout merges contentWidth +
  // textAlign + default block-level container; without applyLayout the
  // wrapper is the minimum needed for the z-index stack.
  const innerClass = applyLayout
    ? [needsClip ? 'relative z-10' : '', innerWidthClass || defaultContentClass, textAlignClass]
        .filter(Boolean)
        .join(' ')
        .trim()
    : needsClip
      ? 'relative z-10'
      : '';

  return (
    <Tag className={mergedClass} style={mergedStyle}>
      {hasBg && (
        <SectionBackground
          imageUrl={(props.backgroundImageUrl as string) || undefined}
          position={bgPosition}
          overlay={overlay}
          props={props}
          sizeCategory={sizeCategory}
        />
      )}
      <div className={innerClass}>{children}</div>
    </Tag>
  );
}
