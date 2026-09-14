/**
 * SectionHeadingRule — shared section header treatment used by the
 * "bold heading + full-width rule (+ optional intro)" blocks
 * (prose_image / values_grid / detail_rows). Kept internal (not a block,
 * not exported from index.ts) so the three blocks stay visually identical
 * without copy-pasting the heading markup.
 *
 * Fully token-driven + prop-driven: the heading routes through
 * HeadingElement (theme typography + per-element overrides), the rule uses
 * --dw-text (theme ink) so it recolors with the tenant theme, and the
 * optional intro is TextBodyElement (muted). No hardcoded copy, no tenant
 * assumptions — every string comes from props.
 */
import type { CSSProperties } from 'react';
import { HeadingElement, TextBodyElement } from '../elements';

interface SectionHeadingRuleProps {
  /** Owning section's props bag — forwarded to the element primitives so
   *  elementTags / elementStyles overrides work. */
  props: Record<string, unknown>;
  /** Heading text. */
  title: string;
  /** Optional intro paragraph rendered under the rule (rich text/HTML). */
  intro?: string;
  /** Show the full-width rule under the heading (default true). */
  showRule?: boolean;
  /** data-element key for the heading (default 'title'). */
  titleKey?: string;
  /** data-element key for the intro (default 'intro'). */
  introKey?: string;
  /** Heading size token (default 'h2'). */
  size?: 'h1' | 'h2' | 'h3';
  /** Bottom margin below the whole header block. */
  className?: string;
}

export function SectionHeadingRule({
  props,
  title,
  intro,
  showRule = true,
  titleKey = 'title',
  introKey = 'intro',
  size = 'h2',
  className,
}: SectionHeadingRuleProps) {
  const safeTitle = typeof title === 'string' ? title : '';
  const safeIntro = typeof intro === 'string' ? intro : '';
  if (!safeTitle && !safeIntro) return null;

  const ruleStyle: CSSProperties = {
    marginTop: '1rem',
    borderBottom: '2px solid var(--dw-text, var(--brand-text, #16181d))',
  };

  return (
    <div className={className}>
      <HeadingElement
        text={safeTitle}
        props={props}
        elementKey={titleKey}
        defaultTag="h2"
        defaultSize={size}
      />
      {showRule && safeTitle && <div aria-hidden="true" style={ruleStyle} />}
      {safeIntro && (
        <TextBodyElement
          text={safeIntro}
          props={props}
          elementKey={introKey}
          defaultTag="div"
          defaultSize="body"
          html
          className="mt-6"
          baseStyle={{ color: 'var(--brand-muted, var(--text-muted, #4b5563))' }}
        />
      )}
    </div>
  );
}
