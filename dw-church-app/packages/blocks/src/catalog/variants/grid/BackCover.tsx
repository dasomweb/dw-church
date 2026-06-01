/**
 * Grid back cover — image fills the spread; closing text is a single
 * small mono caption pinned to the bottom-center. The contact line gets
 * the same gallery-print treatment as the front-cover caption tile.
 */

import {
  CATALOG_SPREAD_ASPECT,
  CATALOG_SPREAD_CLASS,
} from '../../../utilities/catalog-page';
import { getStarterVisuals } from '../../../utilities/catalog-starter-visuals';
import { mergeElementStyle } from '../../../utilities/element-styles';

interface Props {
  props: Record<string, unknown>;
}

export function GridBackCover({ props }: Props) {
  const title = (props.title as string) || '';
  const message = (props.message as string) || '';
  const contactLine = (props.contactLine as string) || '';
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
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center text-xs"
            style={{ color: v.inkMuted }}
          >
            Back cover image (optional)
          </div>
        )}
      </div>

      {/* Bottom-center caption tile */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 p-4 max-w-[60%] text-center"
        style={{ background: v.paper, color: v.ink }}
      >
        {title && (
          <div
            data-element="title"
            style={mergeElementStyle(
              {
                fontFamily: v.headingFamily,
                fontWeight: v.headingWeight,
                letterSpacing: v.headingTracking,
                fontSize: 'var(--fs-h3)',
                lineHeight: 1.15,
              },
              props,
              'title',
            )}
          >
            {title}
          </div>
        )}
        {message && (
          <div
            data-element="message"
            className="mt-2 text-xs"
            style={mergeElementStyle(
              { color: v.inkMuted, lineHeight: 1.5 },
              props,
              'message',
            )}
          >
            {message}
          </div>
        )}
        {contactLine && (
          <div
            data-element="contactLine"
            className="mt-3 text-[10px] font-mono"
            style={mergeElementStyle(
              {
                whiteSpace: 'pre-line',
                color: v.ink,
                letterSpacing: v.eyebrowTracking,
              },
              props,
              'contactLine',
            )}
          >
            {contactLine}
          </div>
        )}
      </div>
    </div>
  );
}
