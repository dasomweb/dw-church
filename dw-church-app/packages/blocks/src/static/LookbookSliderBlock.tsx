/**
 * Lookbook slider — a horizontal, scroll-snapping rail of editorial
 * images (room sets, styled props, seasonal looks). Pure CSS scroll-
 * snap so it's light and needs no JS; works identically on the admin
 * canvas and the storefront. Each card optionally links somewhere
 * (operator-set `href`) — e.g. a product or a section anchor.
 *
 * Mobile: the rail scrolls horizontally at all widths; card width is
 * a viewport-relative clamp so one-and-a-bit cards peek on a phone
 * (signalling "swipe for more") and ~3 show on desktop.
 *
 * Phase-2 element-composition refactor: header + each card's image
 * and caption delegate to HeadingElement / TextBodyElement /
 * ImageElement. The figure/anchor wrapper, snap rules, and aspect
 * ratio are intrinsic to the slider variant so they stay inline.
 */

import { HeadingElement, TextBodyElement, ImageElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';

interface LookbookSliderBlockProps {
  props: Record<string, unknown>;
}

interface LookItem {
  imageUrl?: string;
  caption?: string;
  href?: string;
}

export function LookbookSliderBlock({ props }: LookbookSliderBlockProps) {
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const items = (Array.isArray(props.items) ? props.items : []) as LookItem[];
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  if (items.length === 0) return null;

  return (
    <section
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-md, 4rem)', ...sectionBg.style }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {(title || subtitle) && (
          <header className="mb-6 sm:mb-10">
            <HeadingElement
              text={title}
              props={props}
              elementKey="title"
              defaultTag="h2"
              defaultSize="h2"
            />
            <HeadingElement
              text={subtitle}
              props={props}
              elementKey="subtitle"
              defaultTag="h5"
              defaultSize="h3"
              className="mt-2"
            />
          </header>
        )}

        <div
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'thin' }}
        >
          {items.map((item, idx) => {
            const card = (
              <figure
                className="m-0 shrink-0 snap-start"
                style={{ width: 'clamp(220px, 72vw, 320px)' }}
              >
                <div
                  className="rounded-2xl overflow-hidden bg-gray-100"
                  style={{ aspectRatio: '3 / 4' }}
                >
                  <ImageElement
                    url={item.imageUrl || ''}
                    alt={item.caption || ''}
                    props={props}
                    elementKey={`items[${idx}].imageUrl`}
                    sizeCategory="gallery"
                    fillParent
                    className="w-full h-full object-cover"
                  />
                </div>
                <TextBodyElement
                  text={item.caption || ''}
                  props={props}
                  elementKey={`items[${idx}].caption`}
                  defaultTag="p"
                  defaultSize="caption"
                  className="mt-2"
                />
              </figure>
            );
            return item.href ? (
              <a
                key={idx}
                href={item.href}
                className="block group focus:outline-none focus:ring-2 focus:ring-[var(--accent,var(--dw-primary))] rounded-2xl"
              >
                {card}
              </a>
            ) : (
              <div key={idx}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
