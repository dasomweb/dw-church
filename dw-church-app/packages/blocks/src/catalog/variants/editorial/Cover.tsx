/**
 * Editorial Cover — full-bleed hero image with a serif title block
 * overlaid at the lower-third. A gradient mask from the bottom keeps the
 * type legible without dimming the photograph.
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

export function EditorialCover({ props }: Props) {
  const title = (props.title as string) || '';
  const tagline = (props.tagline as string) || '';
  const year = (props.year as string) || '';
  const brandName = (props.brandName as string) || '';
  const imageUrl = (props.imageUrl as string) || '';
  const v = getStarterVisuals('editorial');

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
      {/* Full-bleed hero */}
      <div
        className="absolute inset-0"
        style={{ background: v.imagePlaceholderBg }}
      >
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

      {/* Brand cap, top-left */}
      <div
        className="absolute top-10 left-10 sm:top-14 sm:left-14 z-10"
        style={{ color: '#fff', mixBlendMode: 'difference' }}
      >
        <div
          className="text-[10px] uppercase"
          style={{ letterSpacing: v.eyebrowTracking }}
        >
          {brandName}
        </div>
      </div>

      {/* Year cap, top-right */}
      <div
        className="absolute top-10 right-10 sm:top-14 sm:right-14 z-10"
        style={{ color: '#fff', mixBlendMode: 'difference' }}
      >
        <div
          className="text-xs font-medium"
          style={{ letterSpacing: v.eyebrowTracking }}
        >
          {year}
        </div>
      </div>

      {/* Bottom gradient mask + title overlay */}
      <div
        className="absolute inset-x-0 bottom-0 pt-32 pb-14 px-10 sm:px-16"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 100%)',
        }}
      >
        {title && (
          <h1
            data-element="title"
            className="leading-[1]"
            style={mergeElementStyle(
              {
                color: '#fff',
                fontFamily: v.headingFamily,
                fontWeight: v.headingWeight,
                letterSpacing: v.headingTracking,
                fontSize: 'var(--fs-display)',
                maxWidth: '18ch',
              },
              props,
              'title',
            )}
          >
            {title}
          </h1>
        )}
        {tagline && (
          <p
            data-element="tagline"
            className="mt-5 max-w-[44ch]"
            style={mergeElementStyle(
              {
                color: 'rgba(255,255,255,0.92)',
                fontSize: 'var(--fs-lg)',
                lineHeight: 1.5,
                fontStyle: 'italic',
              },
              props,
              'tagline',
            )}
          >
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
