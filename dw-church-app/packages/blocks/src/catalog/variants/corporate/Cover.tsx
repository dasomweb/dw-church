/**
 * Corporate Cover — three horizontal bands (brand strip / title block /
 * vision strip). No overlays, no full-bleed. Reads as a printed
 * company catalogue cover: brand identification top, edition
 * identification middle, brand promise / contact bottom.
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

export function CorporateCover({ props }: Props) {
  const title = (props.title as string) || '';
  const tagline = (props.tagline as string) || '';
  const year = (props.year as string) || '';
  const brandName = (props.brandName as string) || '';
  const imageUrl = (props.imageUrl as string) || '';
  const v = getStarterVisuals('corporate');

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
      <div className="absolute inset-0 grid" style={{ gridTemplateRows: 'auto 1fr auto' }}>
        {/* Brand strip — accent bar */}
        <div
          className="flex items-center justify-between px-10 sm:px-14 py-4"
          style={{ background: v.accent, color: '#fff' }}
        >
          <div
            className="text-[11px] uppercase font-semibold"
            style={{ letterSpacing: v.eyebrowTracking }}
          >
            {brandName}
          </div>
          <div
            className="text-[11px] font-mono uppercase"
            style={{ letterSpacing: v.eyebrowTracking }}
          >
            CATALOGUE · {year}
          </div>
        </div>

        {/* Middle — title + hero image split */}
        <div className="grid grid-cols-2">
          <div className="flex flex-col justify-center px-10 sm:px-14 py-10">
            <div
              className="text-[10px] uppercase mb-4"
              style={{ letterSpacing: v.eyebrowTracking, color: v.accent }}
            >
              VOLUME {year || '—'}
            </div>
            {title && (
              <h1
                data-element="title"
                className="leading-[0.95]"
                style={mergeElementStyle(
                  {
                    fontFamily: v.headingFamily,
                    fontWeight: v.headingWeight,
                    letterSpacing: v.headingTracking,
                    fontSize: 'var(--fs-display)',
                    color: v.ink,
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
                className="mt-6 max-w-[36ch]"
                style={mergeElementStyle(
                  {
                    color: v.inkMuted,
                    fontSize: 'var(--fs-base)',
                    lineHeight: 1.55,
                  },
                  props,
                  'tagline',
                )}
              >
                {tagline}
              </p>
            )}
          </div>
          <div
            className="relative border-l"
            style={{ background: v.imagePlaceholderBg, borderColor: v.rule }}
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
        </div>

        {/* Vision strip — bottom rail */}
        <div
          className="flex items-center justify-between px-10 sm:px-14 py-3 border-t"
          style={{ borderColor: v.rule, background: v.paper }}
        >
          <div
            className="text-[10px] font-mono uppercase"
            style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
          >
            ISSUED · {year}
          </div>
          <div
            className="text-[10px] font-mono uppercase"
            style={{ letterSpacing: v.eyebrowTracking, color: v.accent }}
          >
            B2B PRODUCT GUIDE
          </div>
        </div>
      </div>
    </div>
  );
}
