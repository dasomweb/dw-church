/**
 * Layout Block — container that holds child blocks with styling options.
 *
 * Props:
 *   layout: 'row' | 'columns-2' | 'columns-3' | 'columns-4' | 'section'
 *   gap: number (px, default 16)
 *   padding: string (CSS padding, e.g. '24px' or '40px 24px')
 *   margin: string (CSS margin)
 *   backgroundColor: string (hex or CSS color)
 *   backgroundImageUrl: string
 *   overlayColor: string (hex)
 *   overlayOpacity: number (0-100)
 *   borderColor: string (hex)
 *   borderWidth: number (px)
 *   borderRadius: number (px)
 *   divider: boolean (show divider between children)
 *   dividerColor: string (hex)
 *   linkUrl: string (external or internal link — wraps entire block)
 *   linkTarget: '_self' | '_blank'
 *   maxWidth: string ('7xl' | 'full' | '5xl')
 *   children: { blockType: string; props: Record<string, unknown> }[]
 */

import { BlockRenderer } from '../BlockRenderer';

interface LayoutBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function LayoutBlock({ props, slug }: LayoutBlockProps) {
  const layout = (props.layout as string) || 'row';
  const gap = (props.gap as number) ?? 16;
  const padding = (props.padding as string) || '0';
  const margin = (props.margin as string) || '0';
  const bgColor = (props.backgroundColor as string) || undefined;
  const bgImage = (props.backgroundImageUrl as string) || undefined;
  const overlayColor = (props.overlayColor as string) || '#000000';
  const overlayOpacity = typeof props.overlayOpacity === 'number' ? props.overlayOpacity : 0;
  const borderColor = (props.borderColor as string) || undefined;
  const borderWidth = (props.borderWidth as number) || 0;
  const borderRadius = (props.borderRadius as number) || 0;
  const showDivider = !!(props.divider);
  const dividerColor = (props.dividerColor as string) || '#e5e7eb';
  const linkUrl = (props.linkUrl as string) || undefined;
  const linkTarget = (props.linkTarget as string) || '_self';
  const maxWidth = (props.maxWidth as string) || '7xl';
  const children = (props.children as { blockType: string; props: Record<string, unknown> }[]) || [];

  // Grid class based on layout
  const gridClass = layout === 'columns-2' ? 'grid grid-cols-1 md:grid-cols-2'
    : layout === 'columns-3' ? 'grid grid-cols-1 md:grid-cols-3'
    : layout === 'columns-4' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    : 'flex flex-col'; // row or section

  const maxWidthClass = maxWidth === 'full' ? '' : maxWidth === '5xl' ? 'max-w-5xl' : 'max-w-7xl';

  // Container styles
  const containerStyle: React.CSSProperties = {
    padding,
    margin,
    backgroundColor: bgColor,
    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
    backgroundSize: bgImage ? 'cover' : undefined,
    backgroundPosition: bgImage ? 'center' : undefined,
    borderColor: borderColor,
    borderWidth: borderWidth > 0 ? `${borderWidth}px` : undefined,
    borderStyle: borderWidth > 0 ? 'solid' : undefined,
    borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined,
    position: 'relative',
  };

  // Overlay
  const hasOverlay = bgImage && overlayOpacity > 0;

  const content = (
    <div style={containerStyle}>
      {hasOverlay && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity / 100,
            borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined,
          }}
        />
      )}
      <div className={`relative ${maxWidthClass} mx-auto`}>
        <div className={gridClass} style={{ gap: `${gap}px` }}>
          {children.map((child, i) => (
            <div key={i}>
              {showDivider && i > 0 && (
                <div
                  className={layout.startsWith('columns') ? 'hidden' : 'mb-4'}
                  style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: dividerColor }}
                />
              )}
              <BlockRenderer
                section={{
                  id: `layout-child-${i}`,
                  blockType: child.blockType,
                  props: child.props,
                  sortOrder: i,
                  isVisible: true,
                }}
                slug={slug}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Wrap in link if linkUrl is set
  if (linkUrl) {
    const isExternal = linkUrl.startsWith('http');
    if (isExternal) {
      return (
        <a href={linkUrl} target={linkTarget} rel="noopener noreferrer" className="block no-underline text-inherit">
          {content}
        </a>
      );
    }
    return (
      <a href={linkUrl} className="block no-underline text-inherit">
        {content}
      </a>
    );
  }

  return content;
}
