/**
 * ButtonElement — reusable button / CTA module.
 *
 * Sibling to HeadingElement / TextBodyElement. Blocks compose this
 * for any clickable CTA so:
 *   - typography defaults route through --brand-button-* tokens (size,
 *     weight, letter-spacing, line-height all from the operator's theme
 *     typography panel);
 *   - operator's elementStyles[key] overrides per-element via
 *     mergeElementStyle (color / background / borderRadius / etc.);
 *   - operator's elementVariants[key] picks the visual variant
 *     (filled / outlined / ghost) so the block author doesn't bake a
 *     specific variant into JSX;
 *   - data-element + data-element-type="button" lets ElementInspector
 *     show button-specific controls (URL, target, variant) in a later
 *     phase.
 *
 * The render is a stable <a> when href is supplied (external nav) and a
 * <button> when not. The block can wrap this in a flex container for
 * primary+secondary pairs.
 */

import type { CSSProperties } from 'react';
import { mergeElementStyle } from '../utilities/element-styles';

export type ButtonVariant = 'filled' | 'outlined' | 'ghost' | 'link';

interface ButtonElementProps {
  /** Label text. Empty renders nothing. */
  text: string;
  /** Destination URL. When empty, renders a <button> for forms / handlers. */
  href?: string;
  /** Operator props bag (source of elementStyles + elementVariants). */
  props: Record<string, unknown>;
  /** Stable key matching data-element. */
  elementKey: string;
  /** Default variant when operator hasn't picked. */
  defaultVariant?: ButtonVariant;
  /** Open in new tab / window. */
  target?: '_blank' | '_self';
  /** Layout-only className (e.g., margin / column-span). NO typography. */
  className?: string;
  /** Block-level extra base style. */
  baseStyle?: CSSProperties;
}

interface ElementVariantsBag {
  elementVariants?: Record<string, ButtonVariant | undefined>;
}

function resolveVariant(
  props: Record<string, unknown>,
  elementKey: string,
  defaultVariant: ButtonVariant,
): ButtonVariant {
  const v = (props as ElementVariantsBag).elementVariants?.[elementKey];
  if (v === 'filled' || v === 'outlined' || v === 'ghost' || v === 'link') return v;
  return defaultVariant;
}

/**
 * Variant-specific base styles. Colors all reference --brand-* tokens
 * so the operator's palette drives the button look without any hex in
 * the renderer.
 */
function variantBase(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case 'outlined':
      return {
        background: 'transparent',
        color: 'var(--brand-primary)',
        border: '1px solid var(--brand-primary)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--brand-primary)',
        border: '1px solid transparent',
      };
    case 'link':
      // 텍스트 링크 — 패딩/배경/테두리 없이 underline 만. 운영자가 카드
      // 내용 아래 '자세히 보기 →' 류의 가벼운 CTA 를 원할 때 사용.
      return {
        background: 'transparent',
        color: 'var(--brand-primary)',
        border: '1px solid transparent',
        paddingInline: 0,
        paddingBlock: 0,
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
      };
    case 'filled':
    default:
      return {
        background: 'var(--brand-primary)',
        color: 'var(--brand-primary-fg, #fff)',
        border: '1px solid var(--brand-primary)',
      };
  }
}

export function ButtonElement({
  text,
  href,
  props,
  elementKey,
  defaultVariant = 'filled',
  target,
  className,
  baseStyle,
}: ButtonElementProps) {
  // string 아닌 값 (dynamic ref 객체 등) 안전 처리 — 안전망 (2026-05-28).
  const safeText = typeof text === 'string' ? text : '';
  if (!safeText) return null;
  const variant = resolveVariant(props, elementKey, defaultVariant);
  const base: CSSProperties = {
    fontSize: 'var(--brand-button, var(--fs-base))',
    fontWeight: 'var(--brand-button-weight, 600)',
    lineHeight: 'var(--brand-button-line-height, 1)',
    letterSpacing: 'var(--brand-button-letter-spacing, 0)',
    fontFamily: 'var(--brand-font-body)',
    paddingInline: 'var(--brand-button-pad-x, 1.25rem)',
    paddingBlock: 'var(--brand-button-pad-y, 0.625rem)',
    borderRadius: 'var(--brand-radius-md, 8px)',
    cursor: 'pointer',
    display: 'inline-block',
    textDecoration: 'none',
    ...variantBase(variant),
    ...baseStyle,
  };
  const style = mergeElementStyle(base, props, elementKey);
  const commonProps = {
    'data-element': elementKey,
    'data-element-type': 'button',
    'data-default-size': 'button',
    'data-button-variant': variant,
    className,
    style,
  };
  // Special href schemes (catalog:<slug> / form:<slug>) → 모달 트리거
  // 모드. <button> 으로 렌더 + data-modal-* attr stamp. apps/web 의
  // GlobalModalTrigger (client) 가 전역 click 잡아서 iframe 모달 띄움
  // (Phase 3, 대표님 2026-05-26).
  const modalScheme = href && href.startsWith('catalog:')
    ? { kind: 'catalog', slug: href.slice('catalog:'.length) }
    : href && href.startsWith('form:')
      ? { kind: 'form', slug: href.slice('form:'.length) }
      : null;

  if (modalScheme) {
    return (
      <button
        type="button"
        {...commonProps}
        data-modal-kind={modalScheme.kind}
        data-modal-slug={modalScheme.slug}
      >
        {safeText}
      </button>
    );
  }

  if (href) {
    return (
      <a
        {...commonProps}
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      >
        {safeText}
      </a>
    );
  }
  return <button type="button" {...commonProps}>{safeText}</button>;
}
