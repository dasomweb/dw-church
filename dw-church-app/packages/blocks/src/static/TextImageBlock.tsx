import { HeadingElement, TextBodyElement, EyebrowElement, ButtonElement, ImageElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';
import { getElementStyle } from '../utilities/element-styles';

interface TextImageBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

/**
 * Text + Image Split block.
 *
 * Three layouts:
 *   right (default) : text left, image right  ← marketing default
 *   left            : image left, text right
 *   center          : centered text + image stacked below
 *
 * Hooks the section / typography tokens from globals.css:
 *   --section-py-md  vertical rhythm (clamp 4-6rem)
 *   --r-lg           rounded-xl equivalent token
 *
 * Modern knobs (all back-compat):
 *   eyebrow    : small uppercase pill above the H2
 *   subtitle   : short tagline between the H2 and the body content
 *   bgMode     : section background — none / subtle / dark / accent
 *   buttonText, buttonUrl : optional inline CTA below the body
 *
 * The image is wrapped in a fixed aspect-ratio container so the layout
 * doesn't shift when the photo loads (CLS = 0 on this block).
 *
 * Phase-2 element-composition refactor: typography, button, eyebrow,
 * and image markup are delegated to the reusable element modules. The
 * shell here owns only structural concerns: variant dispatch (left /
 * right / center), section background, container query for mobile
 * stacking. No hardcoded copy fallbacks, no Tailwind text-* color
 * classes on elements, no inner max-w/mx-auto caps on the content —
 * operator's elementStyles / elementTags / elementVariants and
 * brand-token CSS variables own those decisions.
 */
export function TextImageBlock({ props }: TextImageBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const content = (props.content as string) ?? '';
  const imageUrl = (props.imageUrl as string) ?? '';
  // The image-container aspect ratio respects the operator's per-element
  // "Aspect Ratio" override (elementStyles.imageUrl) — the container drives the
  // visible box (the img fills it object-cover), so without this the override
  // had no effect. Falls back to the per-variant default below.
  const imgOverride = getElementStyle(props, 'imageUrl');
  const overrideRatio = imgOverride.aspectRatio as string | undefined;
  const overrideRadius = imgOverride.borderRadius as string | undefined;
  // Editor variant buttons write `variant`; older data may use `layout`.
  const layout = ((props.variant as string) || (props.layout as string) || 'right') as 'left' | 'right' | 'center';
  // Mobile stack order for the 50:50 split — independent of the desktop
  // side (layout left/right). 'text-first' preserves the historical
  // behaviour (text above image when stacked); operators who want the
  // visual to lead pick 'image-first'. Honoured via container query so
  // the 375px preview frame stacks/reorders correctly too.
  const mobileStackOrder = ((props.mobileStackOrder as string) ?? 'text-first') as 'image-first' | 'text-first';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  // 2026-05-25: SectionShell + applyLayout=true. 운영자가 인스펙터에서
  // Height / Align / Background Width / Container Width 바꾸면 storefront
  // 즉시 반영. 직접 section 작성 → SectionShell 위임.
  const buttonText = (props.buttonText as string) || '';
  const buttonUrl = (props.buttonUrl as string) || '';
  const buttonNewTab = props.buttonNewTab === true;

  const ctaEl = (
    <div className="mt-7">
      <ButtonElement
        text={buttonText}
        href={buttonUrl}
        target={buttonNewTab ? '_blank' : undefined}
        props={props}
        elementKey="buttonText"
        defaultVariant="filled"
      />
    </div>
  );

  if (layout === 'center') {
    return (
      <SectionShell
        props={props}
        className={sectionBg.className}
        style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
        applyLayout
        defaultContentClass="mx-auto max-w-4xl text-center px-4 sm:px-6"
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--block-gap, 1rem)' }}
        >
          <EyebrowElement
            text={eyebrow}
            props={props}
            elementKey="eyebrow"
          />
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
          />
          {imageUrl && (
            <div
              className="relative mx-auto max-w-2xl w-full overflow-hidden"
              style={{ aspectRatio: overrideRatio ?? '16 / 9', borderRadius: overrideRadius ?? 'var(--r-lg)' }}
            >
              <ImageElement
                url={imageUrl}
                alt={title}
                props={props}
                elementKey="imageUrl"
                sizeCategory="split-side"
                fillParent
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          )}
          <TextBodyElement
            text={content}
            props={props}
            elementKey="content"
            defaultTag="div"
            defaultSize="body"
            html
            className="prose prose-lg mx-auto"
          />
          {ctaEl}
        </div>
      </SectionShell>
    );
  }

  const desktopSide = layout === 'left' ? 'image-left' : 'image-right';

  return (
    <SectionShell
      props={props}
      className={`b2b-cq-host ${sectionBg.className}`.trim()}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div
        className="b2b-cq-split items-center"
        data-desktop={desktopSide}
        data-mobile-order={mobileStackOrder}
      >
        <div
          className="b2b-ti-text"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 1rem)' }}
        >
          <EyebrowElement
            text={eyebrow}
            props={props}
            elementKey="eyebrow"
          />
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
          />
          <TextBodyElement
            text={content}
            props={props}
            elementKey="content"
            defaultTag="div"
            defaultSize="body"
            html
            className="prose prose-lg"
          />
          {ctaEl}
        </div>
        {imageUrl && (
          <div
            className="b2b-ti-img relative overflow-hidden"
            style={{ aspectRatio: overrideRatio ?? '4 / 3', borderRadius: overrideRadius ?? 'var(--r-lg)' }}
          >
            <ImageElement
              url={imageUrl}
              alt={title}
              props={props}
              elementKey="imageUrl"
              sizeCategory="split-side"
              fillParent
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </SectionShell>
  );
}
