/**
 * Corporate back cover — formal closing page. Title strip + Thank-You
 * heading + company info box (multi-line contact) + bottom accent rail.
 * No image overlay; this is the "page for your records" closing.
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

export function CorporateBackCover({ props }: Props) {
  const title = (props.title as string) || '';
  const message = (props.message as string) || '';
  const contactLine = (props.contactLine as string) || '';
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
        {/* Top accent strip */}
        <div
          className="px-10 sm:px-14 py-3"
          style={{ background: v.accent, color: '#fff' }}
        >
          <div
            className="text-[10px] uppercase font-semibold"
            style={{ letterSpacing: v.eyebrowTracking }}
          >
            END OF CATALOGUE
          </div>
        </div>

        {/* Body — title / message / contact box */}
        <div className="grid grid-cols-[1fr_1fr]">
          <div className="flex flex-col justify-center px-10 sm:px-14 py-12">
            {title && (
              <h2
                data-element="title"
                style={mergeElementStyle(
                  {
                    fontFamily: v.headingFamily,
                    fontWeight: v.headingWeight,
                    letterSpacing: v.headingTracking,
                    fontSize: 'var(--fs-h1)',
                    lineHeight: 1.05,
                    color: v.ink,
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
                className="mt-5 max-w-[40ch]"
                style={mergeElementStyle(
                  {
                    color: v.inkMuted,
                    fontSize: 'var(--fs-base)',
                    lineHeight: 1.55,
                  },
                  props,
                  'message',
                )}
              >
                {message}
              </p>
            )}
          </div>

          {/* Right — contact box */}
          <div
            className="relative border-l"
            style={{ borderColor: v.rule, background: v.imagePlaceholderBg }}
          >
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
              <div className="absolute inset-0 flex flex-col justify-center p-10 sm:p-14">
                <div
                  className="text-[10px] uppercase mb-4"
                  style={{ letterSpacing: v.eyebrowTracking, color: v.accent }}
                >
                  CONTACT
                </div>
                {contactLine ? (
                  <pre
                    data-element="contactLine"
                    className="font-mono text-xs whitespace-pre-line"
                    style={mergeElementStyle(
                      {
                        color: v.ink,
                        lineHeight: 1.7,
                        fontFamily: v.bodyFamily,
                      },
                      props,
                      'contactLine',
                    )}
                  >
                    {contactLine}
                  </pre>
                ) : (
                  <div className="text-[11px] italic" style={{ color: v.inkMuted }}>
                    Enter your company address, phone, and registration
                    details across multiple lines in contactLine to show them here.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom mono rail */}
        <div
          className="flex items-center justify-between px-10 sm:px-14 py-3 border-t"
          style={{ borderColor: v.rule }}
        >
          <div
            className="text-[10px] font-mono uppercase"
            style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
          >
            THANK YOU FOR YOUR INTEREST
          </div>
          <div
            className="text-[10px] font-mono uppercase"
            style={{ letterSpacing: v.eyebrowTracking, color: v.accent }}
          >
            ALL RIGHTS RESERVED
          </div>
        </div>
      </div>
    </div>
  );
}
