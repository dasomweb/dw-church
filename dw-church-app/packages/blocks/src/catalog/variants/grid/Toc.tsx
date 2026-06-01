/**
 * Grid TOC — contact-sheet thumbnail grid. Each entry is a numbered tile
 * (image placeholder for now since TOC entries don't carry thumbnails;
 * future work could thread the first product image through). The title
 * is a small caption above the grid, not a hero element.
 */

import {
  CATALOG_SPREAD_ASPECT,
  CATALOG_SPREAD_CLASS,
} from '../../../utilities/catalog-page';
import { getStarterVisuals } from '../../../utilities/catalog-starter-visuals';
import { mergeElementStyle } from '../../../utilities/element-styles';

interface TocEntry {
  number: string;
  label: string;
}

interface Props {
  props: Record<string, unknown>;
}

export function GridToc({ props }: Props) {
  const title = (props.title as string) || '';
  const entries = Array.isArray(props.entries) ? (props.entries as TocEntry[]) : [];
  const v = getStarterVisuals('grid');

  return (
    <div
      className={CATALOG_SPREAD_CLASS}
      style={{
        aspectRatio: CATALOG_SPREAD_ASPECT,
        background: (props.pageBackgroundColor as string) || v.paper,
        borderColor: v.rule,
        color: v.ink,
        fontFamily: v.bodyFamily,
      }}
    >
      <div className="absolute inset-0 flex flex-col p-8 sm:p-10">
        {/* Caption header — small, monospace, not a hero */}
        <div className="flex items-baseline justify-between mb-6">
          <div
            data-element="title"
            className="text-[11px] font-mono uppercase"
            style={mergeElementStyle(
              { letterSpacing: v.eyebrowTracking, color: v.ink },
              props,
              'title',
            )}
          >
            {title}
          </div>
          <div
            className="text-[10px] font-mono"
            style={{ color: v.inkMuted, letterSpacing: v.eyebrowTracking }}
          >
            {entries.length > 0 ? `${entries.length} ITEMS` : ''}
          </div>
        </div>

        {/* Thumbnail grid */}
        {entries.length === 0 ? (
          <p className="text-sm" style={{ color: v.inkMuted }}>
            Pages added after the cover will appear here in the table of contents automatically.
          </p>
        ) : (
          <div
            className="flex-1 min-h-0 grid gap-2 sm:gap-3 content-start overflow-hidden"
            style={{
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            }}
          >
            {entries.slice(0, 24).map((e, i) => (
              <div
                key={i}
                className="aspect-square relative overflow-hidden"
                style={{ background: v.imagePlaceholderBg }}
              >
                <div
                  className="absolute bottom-1 left-1 text-[9px] font-mono"
                  style={{
                    color: v.ink,
                    background: v.paper,
                    padding: '1px 4px',
                  }}
                >
                  {e.number}
                </div>
                <div
                  className="absolute bottom-1 right-1 text-[9px] font-mono truncate max-w-[70%] text-right"
                  style={{
                    color: v.ink,
                    background: v.paper,
                    padding: '1px 4px',
                  }}
                >
                  {e.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
