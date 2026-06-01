/**
 * Empty vertical space — gives the operator a breathing-room control
 * without forcing them into containerStyle margin tweaks. Maps `size`
 * to a fixed pixel height; `divider` paints a thin centered line so
 * the spacer can also act as a visual section break.
 *
 * Heights chosen against `--spacing-section`-class tokens so spacers
 * match the rhythm of normal section padding rather than feeling
 * arbitrary. No text/image content — pure layout primitive, so no
 * element modules are composed.
 */

import { mergeElementStyle } from '../utilities/element-styles';

interface SpacerBlockProps {
  props: Record<string, unknown>;
}

const SIZE_MAP: Record<string, string> = {
  xs: 'h-4 sm:h-6',
  sm: 'h-6 sm:h-10',
  md: 'h-10 sm:h-16',
  lg: 'h-16 sm:h-24',
  xl: 'h-24 sm:h-40',
};

export function SpacerBlock({ props }: SpacerBlockProps) {
  const size = (props.size as string) || 'md';
  const showDivider = props.showDivider === true || props.divider === true;
  const heightClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <section
      data-element="__section__"
      aria-hidden="true"
      className={`${heightClass} flex items-center`}
      style={mergeElementStyle({}, props, '__section__')}
    >
      {showDivider && (
        <div
          data-element="divider"
          className="mx-auto w-full max-w-md border-t"
          style={mergeElementStyle({ borderColor: 'var(--brand-border, #e5e7eb)' }, props, 'divider')}
        />
      )}
    </section>
  );
}
