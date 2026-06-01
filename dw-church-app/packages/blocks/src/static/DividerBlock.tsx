/**
 * Divider — thin horizontal rule. No text content, no images. The
 * <hr> itself carries the data-element hook so the inspector can
 * style its color / thickness via mergeElementStyle.
 */

import { mergeElementStyle } from '../utilities/element-styles';

interface DividerBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function DividerBlock({ props }: DividerBlockProps) {
  const spacing = (props.spacing as 'sm' | 'md' | 'lg') ?? 'md';
  const spacingMap = { sm: 'py-4', md: 'py-8', lg: 'py-12' };

  return (
    <div className={`px-4 sm:px-6 ${spacingMap[spacing]}`}>
      <hr
        data-element="divider"
        className="mx-auto max-w-7xl"
        style={mergeElementStyle({ borderColor: 'var(--brand-border, #e5e7eb)' }, props, 'divider')}
      />
    </div>
  );
}
