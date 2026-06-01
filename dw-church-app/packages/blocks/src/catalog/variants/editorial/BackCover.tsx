/**
 * Editorial back cover — full-bleed image with centered serif Thank-You
 * over a gradient. Visually echoes the cover so the issue closes the
 * way it opened.
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

export function EditorialBackCover({ props }: Props) {
  const title = (props.title as string) || '';
  const message = (props.message as string) || '';
  const contactLine = (props.contactLine as string) || '';
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

      {/* Vignette + centered text */}
      <div
        className="absolute inset-0 grid place-items-center px-12 text-center"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.65) 100%)',
        }}
      >
        <div>
          {title && (
            <h2
              data-element="title"
              style={mergeElementStyle(
                {
                  color: '#fff',
                  fontFamily: v.headingFamily,
                  fontWeight: v.headingWeight,
                  letterSpacing: v.headingTracking,
                  fontSize: 'var(--fs-display)',
                  lineHeight: 1,
                  fontStyle: 'italic',
                },
                props,
                'title',
              )}
            >
              {title}
            </h2>
          )}
          {message && (
            <p
              data-element="message"
              className="mt-6 mx-auto"
              style={mergeElementStyle(
                {
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: 'var(--fs-lg)',
                  lineHeight: 1.6,
                  maxWidth: '46ch',
                },
                props,
                'message',
              )}
            >
              {message}
            </p>
          )}
          {contactLine && (
            <p
              data-element="contactLine"
              className="mt-10 text-xs"
              style={mergeElementStyle(
                {
                  whiteSpace: 'pre-line',
                  color: 'rgba(255,255,255,0.78)',
                  letterSpacing: v.eyebrowTracking,
                },
                props,
                'contactLine',
              )}
            >
              {contactLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
