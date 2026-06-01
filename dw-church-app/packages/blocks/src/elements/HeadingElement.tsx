/**
 * HeadingElement — reusable text-headline module.
 *
 * Blocks compose this instead of hand-rolling `<h2 data-element="title">…`
 * so:
 *   - Operator's "HTML 태그" pick in the inspector flows through
 *     props.elementTags[key] and swaps the rendered tag (h1/h2/.../div/
 *     span/p) for SEO + 시맨틱 control without touching block code.
 *   - The element's typography defaults to the matching --brand-* token
 *     so the operator's theme typography panel ("타이포그래피" 탭) drives
 *     every heading site-wide; inspector-level fontSize/weight/etc still
 *     override per-element via mergeElementStyle.
 *   - data-element + data-element-type attributes are stamped uniformly,
 *     letting ElementInspector dispatch the right control panel (heading-
 *     specific vs body-specific) by reading the type rather than the key.
 *
 * Layout / positioning belongs on the block (the className prop is for
 * margin/spacing only — this module does NOT carry width or alignment
 * controls; those are operator-set on the section / element via
 * styleOverrides).
 */

import type { CSSProperties } from 'react';
import { mergeElementStyle } from '../utilities/element-styles';

/** HTML tags an operator can pick for a heading element. */
export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div' | 'span';

/** Typography scale tokens — each resolves to var(--brand-{scale}) at
 *  render time, so the operator's theme typography panel drives the
 *  underlying size/weight/line-height/letter-spacing. */
export type HeadingSizeToken =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'body' | 'caption' | 'overline' | 'label' | 'button';

interface HeadingElementProps {
  /** Text content (operator-supplied from props). Empty string renders nothing. */
  text: string;
  /** The owning section's props bag — source of elementStyles / elementTags. */
  props: Record<string, unknown>;
  /** Stable key matching data-element. Must be unique inside the section. */
  elementKey: string;
  /** Default tag when the operator hasn't picked one. Block author chooses
   *  per heading slot (page hero → 'h1', section heading → 'h2', etc.). */
  defaultTag?: HeadingTag;
  /** Default size scale. Maps to var(--brand-{token}) via mergeElementStyle. */
  defaultSize?: HeadingSizeToken;
  /** Extra Tailwind classes for layout / positioning ONLY (no typography).
   *  Typography goes through styleOverrides so the inspector can override. */
  className?: string;
  /** Extra base style props (color overlay, max-width, etc.). Block-level
   *  defaults that operator can still override via mergeElementStyle. */
  baseStyle?: CSSProperties;
}

interface ElementTagsBag {
  elementTags?: Record<string, HeadingTag | undefined>;
}

function resolveTag(
  props: Record<string, unknown>,
  elementKey: string,
  defaultTag: HeadingTag,
): HeadingTag {
  const tags = (props as ElementTagsBag).elementTags;
  const picked = tags?.[elementKey];
  if (picked && /^(h[1-6]|p|div|span)$/.test(picked)) {
    return picked;
  }
  return defaultTag;
}

export function HeadingElement({
  text,
  props,
  elementKey,
  defaultTag = 'h2',
  defaultSize = 'h2',
  className,
  baseStyle,
}: HeadingElementProps) {
  // string 아닌 값 (dynamic ref 객체 등) 안전 처리 — 안전망 (2026-05-28).
  const safeText = typeof text === 'string' ? text : '';
  if (!safeText) return null;
  const Tag = resolveTag(props, elementKey, defaultTag);
  // Base typography references --brand-{size}-* family — when the
  // operator's theme changes any of these tokens (or alias chain into
  // --fs-*), this heading follows. mergeElementStyle layers the
  // operator's per-element override on top.
  const base: CSSProperties = {
    fontSize: `var(--brand-${defaultSize}, var(--fs-${defaultSize}))`,
    fontWeight: `var(--brand-${defaultSize}-weight)`,
    lineHeight: `var(--brand-${defaultSize}-line-height)`,
    letterSpacing: `var(--brand-${defaultSize}-letter-spacing)`,
    fontFamily:
      defaultSize === 'body' || defaultSize === 'caption' || defaultSize === 'label'
        ? 'var(--brand-font-body)'
        : 'var(--brand-font-heading)',
    ...baseStyle,
  };
  return (
    <Tag
      data-element={elementKey}
      data-element-type="heading"
      data-default-size={defaultSize}
      className={className}
      style={mergeElementStyle(base, props, elementKey)}
    >
      {safeText}
    </Tag>
  );
}
