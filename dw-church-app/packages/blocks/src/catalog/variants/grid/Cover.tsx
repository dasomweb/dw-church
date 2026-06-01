/**
 * Grid Cover — image fills the spread; metadata lives in a tiny corner
 * caption block. Reads as a contact-sheet opener; the brand identity
 * comes from the image work, not from typography. Caption is monospace
 * for the gallery-print feel.
 */

import {
  CATALOG_SPREAD_ASPECT,
  CATALOG_SPREAD_CLASS,
} from '../../../utilities/catalog-page';
import { getStarterVisuals } from '../../../utilities/catalog-starter-visuals';
import { mergeElementStyle } from '../../../utilities/element-styles';
import { imgAttrs } from '../../../utilities/responsive-image';

interface Props {
  props: Record<string, unknown>;
}

export function GridCover({ props }: Props) {
  const title = (props.title as string) || '';
  const tagline = (props.tagline as string) || '';
  const year = (props.year as string) || '';
  const brandName = (props.brandName as string) || '';
  const imageUrl = (props.imageUrl as string) || '';
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
      <div className="absolute inset-0" style={{ background: v.imagePlaceholderBg }}>
        {imageUrl ? (
          <img
            data-element="imageUrl"
            src={imageUrl}
            alt={title || brandName || ''}
            {...imgAttrs('hero-bg', imageUrl)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center text-xs"
            style={{ color: v.inkMuted }}
          >
            Add a cover image
          </div>
        )}
      </div>

      {/* Tiny top-left caption block */}
      <div
        className="absolute top-6 left-6 p-3"
        style={{ background: v.paper, color: v.ink }}
      >
        <div
          className="text-[9px] font-mono uppercase"
          style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
        >
          {brandName}
        </div>
        {title && (
          <div
            data-element="title"
            className="mt-1.5"
            style={mergeElementStyle(
              {
                fontFamily: v.headingFamily,
                fontWeight: v.headingWeight,
                letterSpacing: v.headingTracking,
                fontSize: 'var(--fs-lg)',
                lineHeight: 1.1,
                maxWidth: '20ch',
              },
              props,
              'title',
            )}
          >
            {title}
          </div>
        )}
        {tagline && (
          <div
            data-element="tagline"
            className="mt-1.5 text-[10px] font-mono"
            style={mergeElementStyle(
              { color: v.inkMuted, lineHeight: 1.45, maxWidth: '32ch' },
              props,
              'tagline',
            )}
          >
            {tagline}
          </div>
        )}
      </div>

      {/* Tiny bottom-right year stamp */}
      <div
        className="absolute bottom-6 right-6 px-2 py-1 text-[10px] font-mono"
        style={{
          background: v.paper,
          color: v.ink,
          letterSpacing: v.eyebrowTracking,
        }}
      >
        {year}
      </div>
    </div>
  );
}
