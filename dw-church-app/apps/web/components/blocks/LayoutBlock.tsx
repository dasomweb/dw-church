import type { CSSProperties } from 'react';
import { BlockRenderer } from '../BlockRenderer';

/**
 * Storefront Layout Block — same container/grid as the shared LayoutBlock, but
 * renders its children through the STOREFRONT BlockRenderer so that Data Blocks
 * (recent_sermons / news_announcements / verse_of_day / event_grid …) inside a
 * layout column render as REAL data, not the shared placeholder. The shared
 * LayoutBlock uses the packages/blocks renderer which only knows static blocks,
 * so data-block children showed placeholders (대표님: 말씀|주보 2단 안 됨).
 */
interface LayoutBlockProps { props: Record<string, unknown>; slug: string }

export function LayoutBlock({ props, slug }: LayoutBlockProps) {
  const layout = (props.layout as string) || 'row';
  const gap = (props.gap as number) ?? 16;
  const padding = (props.padding as string) || '0';
  const margin = (props.margin as string) || '0';
  const bgColor = (props.backgroundColor as string) || undefined;
  const bgImage = (props.backgroundImageUrl as string) || undefined;
  const overlayColor = (props.overlayColor as string) || '';
  const overlayOpacity = typeof props.overlayOpacity === 'number' ? props.overlayOpacity : 0;
  const borderColor = (props.borderColor as string) || undefined;
  const borderWidth = (props.borderWidth as number) || 0;
  const borderRadius = (props.borderRadius as number) || 0;
  const maxWidth = (props.maxWidth as string) || '7xl';
  const children = (Array.isArray(props.children) ? props.children : []) as { blockType: string; props: Record<string, unknown> }[];

  const gridClass = layout === 'columns-2' || layout === 'two_columns' ? 'grid grid-cols-1 md:grid-cols-2'
    : layout === 'columns-3' || layout === 'three_columns' ? 'grid grid-cols-1 md:grid-cols-3'
    : layout === 'columns-4' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    : 'flex flex-col';
  const maxWidthClass = maxWidth === 'full' ? '' : maxWidth === '5xl' ? 'max-w-5xl' : 'max-w-7xl';

  const containerStyle: CSSProperties = {
    padding, margin,
    backgroundColor: bgColor,
    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
    backgroundSize: bgImage ? 'cover' : undefined,
    backgroundPosition: bgImage ? 'center' : undefined,
    borderColor,
    borderWidth: borderWidth > 0 ? `${borderWidth}px` : undefined,
    borderStyle: borderWidth > 0 ? 'solid' : undefined,
    borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined,
    position: 'relative',
  };
  const hasOverlay = bgImage && overlayOpacity > 0;

  return (
    <div style={containerStyle}>
      {hasOverlay && (
        <div className="absolute inset-0" style={{ backgroundColor: overlayColor || 'transparent', opacity: overlayOpacity / 100, borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined }} />
      )}
      <div className={`relative ${maxWidthClass} mx-auto`.trim()}>
        <div className={gridClass} style={{ gap: `${gap}px` }}>
          {children.map((child, i) => (
            <div key={i} className="min-w-0">
              <BlockRenderer
                section={{ id: `layout-child-${i}`, blockType: child.blockType, props: { ...(child.props ?? {}), _inLayout: true }, sortOrder: i, isVisible: true }}
                slug={slug}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
