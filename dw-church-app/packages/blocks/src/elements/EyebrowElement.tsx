/**
 * EyebrowElement — small uppercase label that sits above a heading
 * ("FEATURED" / "INTRODUCING" / "STEP 01" 류). Reusable module so
 * blocks don't hand-roll the tiny-text styling every time.
 *
 * Typography defaults route through --brand-overline (or --brand-label
 * when overline isn't set) so the operator's theme drives the size /
 * weight / tracking. data-element-type="eyebrow" lets ElementInspector
 * eventually offer eyebrow-specific controls (e.g. accent color picker
 * tied to --brand-accent).
 */

import type { CSSProperties } from 'react';
import { mergeElementStyle } from '../utilities/element-styles';

interface EyebrowElementProps {
  text: string;
  props: Record<string, unknown>;
  elementKey: string;
  /** Default HTML tag. <span> for inline, <p> for paragraph-style block. */
  defaultTag?: 'span' | 'p' | 'div';
  /** Layout-only className. */
  className?: string;
  /** Block-level extra base. */
  baseStyle?: CSSProperties;
}

interface ElementTagsBag {
  elementTags?: Record<string, 'span' | 'p' | 'div' | undefined>;
}

export function EyebrowElement({
  text,
  props,
  elementKey,
  defaultTag = 'span',
  className,
  baseStyle,
}: EyebrowElementProps) {
  if (!text) return null;
  const tags = (props as ElementTagsBag).elementTags;
  const picked = tags?.[elementKey];
  const Tag: 'span' | 'p' | 'div' =
    picked === 'p' || picked === 'div' || picked === 'span' ? picked : defaultTag;
  const base: CSSProperties = {
    fontSize: 'var(--brand-overline, var(--brand-label, var(--fs-sm)))',
    fontWeight: 'var(--brand-overline-weight, 600)',
    lineHeight: 'var(--brand-overline-line-height, 1.4)',
    letterSpacing: 'var(--brand-overline-letter-spacing, 1.5px)',
    textTransform: 'uppercase',
    fontFamily: 'var(--brand-font-body)',
    color: 'var(--brand-accent)',
    ...baseStyle,
  };
  return (
    <Tag
      data-element={elementKey}
      data-element-type="eyebrow"
      data-default-size="overline"
      className={className}
      style={mergeElementStyle(base, props, elementKey)}
    >
      {text}
    </Tag>
  );
}
