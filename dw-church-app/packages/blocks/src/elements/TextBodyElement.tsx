/**
 * TextBodyElement — reusable rich-text / paragraph module.
 *
 * Sibling to HeadingElement, but for long-form body copy:
 *   - Renders HTML (operator's WYSIWYG output via dangerouslySetInnerHTML)
 *     or plain text when `html` is false.
 *   - Defaults to <div> (multi-paragraph capable) or <p> (single paragraph)
 *     based on `defaultTag` — operator can swap via elementTags[key].
 *   - Typography defaults to --brand-body / --fs-base via mergeElementStyle.
 *   - data-element-type="text-body" so ElementInspector can show body-
 *     specific controls (paragraph spacing, drop cap, link color) once
 *     Phase 4 lands.
 */

import type { CSSProperties } from 'react';
import { mergeElementStyle } from '../utilities/element-styles';
import type { HeadingTag, HeadingSizeToken } from './HeadingElement';

/** Tags suitable for body copy. Subset of HeadingTag — bodies are
 *  typically <p>/<div>/<span>, but we accept h1-h6 too so the operator
 *  isn't constrained by our typology when their content really is a
 *  heading inside a "content" slot. */
export type TextBodyTag = HeadingTag;

interface TextBodyElementProps {
  /** Body content. May be HTML when `html` is true (operator's rich text). */
  text: string;
  /** The owning section's props bag. */
  props: Record<string, unknown>;
  /** Stable key matching data-element. */
  elementKey: string;
  /** Default tag. 'p' for paragraph, 'div' when content may contain
   *  multiple paragraphs (block-level children). */
  defaultTag?: TextBodyTag;
  /** Typography scale default. Body copy → 'body'; small caption → 'caption'. */
  defaultSize?: HeadingSizeToken;
  /** Treat `text` as HTML (operator's WYSIWYG output) — uses
   *  dangerouslySetInnerHTML. Defaults to false for safety. */
  html?: boolean;
  /** Layout-only className (margin / column-span / etc.). */
  className?: string;
  /** Block-level base style additions. */
  baseStyle?: CSSProperties;
}

interface ElementTagsBag {
  elementTags?: Record<string, TextBodyTag | undefined>;
}

function resolveTag(
  props: Record<string, unknown>,
  elementKey: string,
  defaultTag: TextBodyTag,
): TextBodyTag {
  const tags = (props as ElementTagsBag).elementTags;
  const picked = tags?.[elementKey];
  if (picked && /^(h[1-6]|p|div|span)$/.test(picked)) {
    return picked;
  }
  return defaultTag;
}

/**
 * 운영자가 인스펙터의 'html' textarea 에 plain text + 줄바꿈만 입력한
 * 경우 (HTML 태그 전혀 없음), 자동으로 단락 / 줄바꿈 변환:
 *   빈 줄 (\n\n+)  → 새 <p> 단락
 *   single \n      → <br/>
 * HTML 태그가 하나라도 보이면 운영자가 의도적으로 HTML 작성한 것이므로
 * 그대로 통과 (변환 안 함). FAQ 답변 / TextOnly content / Quote 등
 * 모든 html=true 슬롯에 일관 적용 (대표님 2026-05-27 — 엔터키만으로
 * 단락 분리 동작하게).
 */
const HTML_TAG_RE = /<\/?[a-z][^>]*>/i;
function autoFormatRichText(raw: string): string {
  // 안전망 — dynamic ref 객체 등 string 아닌 값이 들어오면 빈 문자열.
  // 정상 경로(admin placeholderResolve / storefront resolveDynamicProps)
  // 면 항상 string 이지만, 못 잡는 nested 경로 대비 (대표님 2026-05-28
  // "e.split is not a function" 의 근본 방어).
  if (typeof raw !== 'string') return '';
  if (HTML_TAG_RE.test(raw)) return raw;
  // Escape only the chars that could break HTML semantics. & 처리는
  // dangerouslySetInnerHTML 에 직접 들어가니까 안전하게 escape.
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const paragraphs = raw.split(/\n{2,}/);
  return paragraphs
    .map((para) => {
      const escaped = escape(para).replace(/\n/g, '<br/>');
      return `<p>${escaped}</p>`;
    })
    .join('');
}

export function TextBodyElement({
  text,
  props,
  elementKey,
  defaultTag = 'div',
  defaultSize = 'body',
  html = false,
  className,
  baseStyle,
}: TextBodyElementProps) {
  // string 아닌 값 (dynamic ref 객체 등) 안전 처리 — React child 로
  // 객체가 들어가면 "Objects are not valid as a React child" (#31) 크래시.
  const safeText = typeof text === 'string' ? text : '';
  if (!safeText) return null;
  const Tag = resolveTag(props, elementKey, defaultTag);
  const base: CSSProperties = {
    fontSize: `var(--brand-${defaultSize}, var(--fs-${defaultSize === 'body' ? 'base' : defaultSize}))`,
    fontWeight: `var(--brand-${defaultSize}-weight)`,
    lineHeight: `var(--brand-${defaultSize}-line-height)`,
    letterSpacing: `var(--brand-${defaultSize}-letter-spacing)`,
    fontFamily: 'var(--brand-font-body)',
    ...baseStyle,
  };
  const style = mergeElementStyle(base, props, elementKey);
  // dangerouslySetInnerHTML and children are mutually exclusive — use
  // the WYSIWYG html path when the operator's content is rich text
  // (TextOnly's `content`, Quote's `quote`), otherwise just render the
  // plain-text node as React children.
  if (html) {
    return (
      <Tag
        data-element={elementKey}
        data-element-type="text-body"
        data-default-size={defaultSize}
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: autoFormatRichText(safeText) }}
      />
    );
  }
  return (
    <Tag
      data-element={elementKey}
      data-element-type="text-body"
      data-default-size={defaultSize}
      className={className}
      style={style}
    >
      {safeText}
    </Tag>
  );
}
