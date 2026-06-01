/**
 * Dedicated CTA section block — six visually distinct variants in one
 * block_type, all sharing the same prop surface so the AI agent picks
 * the variant by purpose (end-of-page vs. between-sections vs. B2B
 * contact ask) and the operator can swap variants without losing
 * already-filled content.
 *
 *   inline-banner — horizontal strip: title + buttons, narrow height.
 *                   Use case: between-section nudge, blog footer.
 *   boxed-card    — centered card with eyebrow + title + description +
 *                   buttons. Use case: end-of-page conversion ask.
 *   image-overlay — full-bleed background image with eyebrow + title +
 *                   subtitle + CTA centered on top. Hero-style impact
 *                   at the bottom of the page. Use case: end-of-page
 *                   conversion ask when the brand wants to close with
 *                   imagery, not just a colored card.
 *   split-image   — image on one side, copy + CTA on the other. Use
 *                   case: feature/case-study landing pages.
 *   stats-strip   — proof stats row above title + CTA. Use case:
 *                   credibility-first conversion (numbers prove value
 *                   before the ask).
 *   contact-info  — phone + email surfaced inline next to a CTA. Use
 *                   case: B2B "request a quote" / "schedule a call"
 *                   patterns where the contact info itself is the CTA.
 *
 * Existing `call_to_action` rows (which were rendering through
 * HeroBannerBlock with variant=text-only) get a back-compat path: when
 * a row arrives with no variant prop AND no CTA-section-specific
 * shapes, we render the inline-banner variant which approximates the
 * old text-only hero. Tenants migrating off the legacy mapping won't
 * see visual disruption.
 *
 * Phase-2 element-composition refactor: typography, button, eyebrow,
 * and image markup are delegated to the reusable element modules
 * (HeadingElement / TextBodyElement / EyebrowElement / ButtonElement /
 * ImageElement). The shell here owns only structural concerns: variant
 * dispatch, layout grid, padding, gap, overlay layer, gradient tokens.
 * No hardcoded copy fallbacks, no inner max-w/mx-auto caps on content,
 * no Tailwind text-color classes on elements — operator's
 * elementStyles / elementTags / elementVariants and brand-token CSS
 * variables own those decisions.
 *
 * 2026-05-29: 모든 variant 를 SectionShell+applyLayout 으로 마이그레이션.
 * 이전엔 각 variant 가 hand-roll `<section className="mx-auto max-w-Nxl
 * px-4 sm:px-6">` 를 박고 있어서 운영자의 backgroundImage / overlay /
 * border / width / contentWidth / textAlign / height 토글이 무시되던
 * 상태였음. SectionShell 이 outer envelope (bg + overlay + border) 와
 * inner contentWidthClass (mobile px + max-w) 양쪽을 owner. CTA variant
 * 별 카드/그리드 구조 (BoxedCard 의 rounded-3xl 카드, SplitImage 의 2-col
 * 그리드 등) 는 inner 에 유지 — 그게 variant identity. 단, hand-roll
 * max-w 는 모두 제거하고 contentWidthClass 가 결정.
 */

import {
  HeadingElement,
  TextBodyElement,
  EyebrowElement,
  ButtonElement,
  ImageElement,
} from '../elements';
import { SectionShell } from '../utilities/SectionShell';

interface CtaSectionBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

type Variant =
  | 'inline-banner'
  | 'boxed-card'
  | 'image-overlay'
  | 'split-image'
  | 'stats-strip'
  | 'contact-info';

const ALIGN_MAP: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function resolveVariant(props: Record<string, unknown>): Variant {
  const v = props.variant as string | undefined;
  if (
    v === 'inline-banner' ||
    v === 'boxed-card' ||
    v === 'image-overlay' ||
    v === 'split-image' ||
    v === 'stats-strip' ||
    v === 'contact-info'
  ) {
    return v;
  }
  // Legacy: hero_banner-style rows that landed here. Pick a sensible
  // default based on what fields are populated.
  if (props.backgroundImageUrl) return 'image-overlay';
  if (props.imageUrl) return 'split-image';
  if (Array.isArray(props.items) && (props.items as unknown[]).length > 0) return 'stats-strip';
  if (props.contactPhone || props.contactEmail) return 'contact-info';
  return 'boxed-card';
}

function bgClasses(mode: string | undefined, fallback = 'subtle'): string {
  // NOTE: text-color is no longer baked in here — elements own their
  // own color via mergeElementStyle / --brand-* tokens.
  switch (mode || fallback) {
    case 'none':
      return 'bg-white';
    case 'accent':
      return 'bg-[var(--accent,var(--dw-primary))]';
    case 'gradient':
      return 'bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)]';
    case 'subtle':
    default:
      return 'bg-[var(--dw-surface,#f9fafb)]';
  }
}

/* ─── Main dispatcher ──────────────────────────────────────── */

export function CtaSectionBlock({ props, slug }: CtaSectionBlockProps) {
  const variant = resolveVariant(props);
  switch (variant) {
    case 'inline-banner':
      return <InlineBanner props={props} slug={slug} />;
    case 'image-overlay':
      return <ImageOverlay props={props} slug={slug} />;
    case 'split-image':
      return <SplitImage props={props} slug={slug} />;
    case 'stats-strip':
      return <StatsStrip props={props} slug={slug} />;
    case 'contact-info':
      return <ContactInfo props={props} slug={slug} />;
    case 'boxed-card':
    default:
      return <BoxedCard props={props} slug={slug} />;
  }
}

/* ─── Shared CTA pair ──────────────────────────────────────── */

/**
 * Primary + (optional) secondary CTA buttons. Delegates fully to
 * ButtonElement so variant / typography / color come from the operator
 * via elementVariants + elementStyles + --brand-button-* tokens.
 * `stack` is used by contact-info's side column to render the buttons
 * vertically.
 */
function CtaPair({
  props,
  stack,
  align,
}: {
  props: Record<string, unknown>;
  stack?: boolean;
  align?: string;
}) {
  const primaryText = (props.buttonText as string) || (props.ctaLabel as string) || '';
  const primaryUrl = (props.buttonUrl as string) || (props.ctaUrl as string) || '';
  const primaryNewTab = props.buttonNewTab === true;
  const secondaryText = (props.secondaryButtonText as string) || '';
  const secondaryUrl = (props.secondaryButtonUrl as string) || '';
  const secondaryNewTab = props.secondaryButtonNewTab === true;
  if (!primaryText && !secondaryText) return null;

  const justify =
    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : '';
  const layout = stack
    ? 'flex flex-col gap-3 items-stretch'
    : `mt-7 flex gap-3 flex-wrap items-center ${justify}`;

  return (
    <div className={layout}>
      <ButtonElement
        text={primaryText}
        href={primaryUrl}
        target={primaryNewTab ? '_blank' : undefined}
        props={props}
        elementKey="buttonText"
        defaultVariant="filled"
      />
      <ButtonElement
        text={secondaryText}
        href={secondaryUrl}
        target={secondaryNewTab ? '_blank' : undefined}
        props={props}
        elementKey="secondaryButtonText"
        defaultVariant="outlined"
      />
    </div>
  );
}

/* ─── 1. image-overlay (hero-style) ────────────────────────── */

/**
 * Full-bleed background image (or SectionShell's gradient fallback)
 * with eyebrow + title + subtitle + CTA centered on top. SectionShell
 * applyLayout owns height / width / contentWidth / textAlign / overlay
 * / border / backgroundImage so the operator's LayoutField + OverlayField
 * + BorderField + BackgroundField inputs flow uniformly with every other
 * section. Differs from hero_banner only in semantic role (end-of-page
 * conversion vs. top-of-page intro).
 */
function ImageOverlay({ props }: CtaSectionBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || (props.description as string) || '';

  return (
    <SectionShell
      props={props}
      applyLayout
      style={{ paddingBlock: 'var(--section-py-lg)' }}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 1rem)' }}
      >
        <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h1"
        />
        <HeadingElement
          text={subtitle}
          props={props}
          elementKey="subtitle"
          defaultTag="h5"
          defaultSize="h3"
        />
        <CtaPair props={props} align={(props.textAlign as string) || (props.align as string) || 'center'} />
      </div>
    </SectionShell>
  );
}

/* ─── 2. inline-banner ─────────────────────────────────────── */

function InlineBanner({ props }: CtaSectionBlockProps) {
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || (props.description as string) || '';
  const bgMode = (props.bgMode as string) || 'accent';

  return (
    <SectionShell
      props={props}
      applyLayout
      className={bgClasses(bgMode, 'accent')}
      style={{ paddingBlock: 'var(--section-py-md)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 justify-between">
        <div
          className="flex-1 min-w-0"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 0.5rem)' }}
        >
          <HeadingElement
            text={title}
            props={props}
            elementKey="title"
            defaultTag="h2"
            defaultSize="h3"
          />
          <HeadingElement
            text={subtitle}
            props={props}
            elementKey="subtitle"
            defaultTag="h5"
            defaultSize="h3"
          />
        </div>
        <CtaPair props={props} />
      </div>
    </SectionShell>
  );
}

/* ─── 3. boxed-card ────────────────────────────────────────── */

function BoxedCard({ props }: CtaSectionBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) || '';
  const description = (props.description as string) || (props.subtitle as string) || '';
  // textAlign 우선 + align fallback — LayoutField 가 'textAlign' 으로
  // 새 셋팅을 쓰니까 신규 값이 우선해야 함. 'align' 은 기존 데이터의
  // backward compat 으로만.
  const align = (props.textAlign as string) || (props.align as string) || 'center';
  const bgMode = (props.bgMode as string) || 'subtle';
  const alignClass = ALIGN_MAP[align] || ALIGN_MAP.center;

  return (
    <SectionShell
      props={props}
      applyLayout
      className="bg-white"
      style={{ paddingBlock: 'var(--section-py-lg)' }}
    >
      <div
        className={`rounded-3xl ${bgClasses(bgMode, 'subtle')} ${alignClass}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--block-gap, 1rem)',
          paddingInline: 'clamp(2rem, 5vw, 3.5rem)',
          paddingBlock: 'clamp(3.5rem, 7vw, 5rem)',
        }}
      >
        <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h1"
        />
        <TextBodyElement
          text={description}
          props={props}
          elementKey="description"
          defaultTag="p"
          defaultSize="body"
        />
        <CtaPair props={props} align={align} />
      </div>
    </SectionShell>
  );
}

/* ─── 4. split-image ───────────────────────────────────────── */

function SplitImage({ props }: CtaSectionBlockProps) {
  const eyebrow = (props.eyebrow as string) || '';
  const title = (props.title as string) || '';
  const description = (props.description as string) || (props.subtitle as string) || '';
  const imageUrl = (props.imageUrl as string) || '';
  const imageSide = (props.imageSide as string) === 'left' ? 'left' : 'right';
  const bgMode = (props.bgMode as string) || 'none';

  const textCol = (
    <div
      className="flex flex-col justify-center"
      style={{
        gap: 'var(--block-gap, 1rem)',
        paddingInline: 'clamp(2rem, 5vw, 3.5rem)',
        paddingBlock: 'clamp(3.5rem, 7vw, 5rem)',
      }}
    >
      <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
      <HeadingElement
        text={title}
        props={props}
        elementKey="title"
        defaultTag="h2"
        defaultSize="h1"
      />
      <TextBodyElement
        text={description}
        props={props}
        elementKey="description"
        defaultTag="p"
        defaultSize="body"
      />
      <CtaPair props={props} align="left" />
    </div>
  );

  const imgCol = imageUrl ? (
    <div className="relative bg-gray-100 overflow-hidden rounded-3xl m-4 sm:m-6">
      <ImageElement
        url={imageUrl}
        alt=""
        props={props}
        elementKey="imageUrl"
        sizeCategory="split-side"
        imageLoading="lazy"
        fillParent
        className="absolute inset-0 w-full h-full object-cover rounded-3xl"
        baseStyle={{ aspectRatio: '4 / 3' }}
      />
    </div>
  ) : (
    <div className="bg-gradient-to-br from-[var(--dw-primary)] to-[var(--dw-secondary)] opacity-20 rounded-3xl m-4 sm:m-6" />
  );

  return (
    <SectionShell
      props={props}
      applyLayout
      style={{ paddingBlock: 'var(--section-py-sm)' }}
    >
      <div
        className={`grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-gray-200 ${bgClasses(bgMode, 'none')}`}
      >
        {imageSide === 'left' ? (
          <>
            {imgCol}
            {textCol}
          </>
        ) : (
          <>
            {textCol}
            {imgCol}
          </>
        )}
      </div>
    </SectionShell>
  );
}

/* ─── 5. stats-strip ───────────────────────────────────────── */

function StatsStrip({ props }: CtaSectionBlockProps) {
  const title = (props.title as string) || '';
  const description = (props.description as string) || (props.subtitle as string) || '';
  const bgMode = (props.bgMode as string) || 'subtle';
  const onDark = bgMode === 'accent' || bgMode === 'gradient';
  // Stats live on `props.items` so they share the same items[] editing
  // surface every other list-bearing block uses (ItemsEditor in the
  // inspector resolves through ITEM_FIELDS_BY_TYPE['cta_section']).
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];

  return (
    <SectionShell
      props={props}
      applyLayout
      className={bgClasses(bgMode, 'subtle')}
      style={{ paddingBlock: 'var(--section-py-lg)' }}
    >
      <div
        className="text-center"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 1rem)' }}
      >
        {items.length > 0 && (
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-10 pb-8 sm:pb-10 border-b border-gray-200"
            style={onDark ? { borderColor: 'rgba(255,255,255,0.2)' } : undefined}
          >
            {items.map((s, idx) => (
              <div key={idx} className="text-center">
                {/* items[N].value / items[N].label — passing the item
                 * itself (`s`) as the props bag so HeadingElement reads
                 * elementStyles off the list-item, matching the
                 * ItemsEditor inspector convention. */}
                <HeadingElement
                  text={(s.value as string) || ''}
                  props={s}
                  elementKey={`items[${idx}].value`}
                  defaultTag="div"
                  defaultSize="h1"
                />
                <HeadingElement
                  text={(s.label as string) || ''}
                  props={s}
                  elementKey={`items[${idx}].label`}
                  defaultTag="div"
                  defaultSize="body"
                />
              </div>
            ))}
          </div>
        )}
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h1"
        />
        <TextBodyElement
          text={description}
          props={props}
          elementKey="description"
          defaultTag="p"
          defaultSize="body"
        />
        <CtaPair props={props} align="center" />
      </div>
    </SectionShell>
  );
}

/* ─── 6. contact-info ──────────────────────────────────────── */

function ContactInfo({ props }: CtaSectionBlockProps) {
  const title = (props.title as string) || '';
  const description = (props.description as string) || (props.subtitle as string) || '';
  const phone = (props.contactPhone as string) || '';
  const email = (props.contactEmail as string) || '';
  const bgMode = (props.bgMode as string) || 'subtle';

  return (
    <SectionShell
      props={props}
      applyLayout
      className={bgClasses(bgMode, 'subtle')}
      style={{ paddingBlock: 'var(--section-py-lg)' }}
    >
      <div
        className="rounded-3xl bg-white grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-center shadow-sm border border-gray-100"
        style={{
          paddingInline: 'clamp(1.5rem, 4vw, 3.5rem)',
          paddingBlock: 'clamp(2.5rem, 5vw, 4rem)',
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 0.75rem)' }}
        >
          <HeadingElement
            text={title}
            props={props}
            elementKey="title"
            defaultTag="h2"
            defaultSize="h2"
          />
          <TextBodyElement
            text={description}
            props={props}
            elementKey="description"
            defaultTag="p"
            defaultSize="body"
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2"
                aria-label={`Phone: ${phone}`}
              >
                <span aria-hidden="true">📞</span>
                <TextBodyElement
                  text={phone}
                  props={props}
                  elementKey="contactPhone"
                  defaultTag="span"
                  defaultSize="body"
                />
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2"
                aria-label={`Email: ${email}`}
              >
                <span aria-hidden="true">✉️</span>
                <TextBodyElement
                  text={email}
                  props={props}
                  elementKey="contactEmail"
                  defaultTag="span"
                  defaultSize="body"
                />
              </a>
            )}
          </div>
        </div>
        <div className="flex md:flex-col items-stretch md:items-end gap-3 shrink-0">
          <CtaPair props={props} align="left" stack />
        </div>
      </div>
    </SectionShell>
  );
}
