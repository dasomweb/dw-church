import { HeadingElement, TextBodyElement, ImageElement, EyebrowElement, ButtonElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';
import { Icon } from '../utilities/Icon';
import { ICONS } from '../icons/icons';

/**
 * Features / Cards grid — three layout variants (per web-block-patterns
 * §2.4):
 *
 *   compact     (default): small 48×48 icon at top + title + 1-line desc.
 *                Used for "trust" rows like Stanislav's 4 advantages.
 *   image-card           : full-width image at the top of the card +
 *                title + caption + desc below. Matches the catalog
 *                grids in InteriorStudio (Featured Collections) and
 *                the Russian RE site (Каталог объектов).
 *   icon-large           : centered 80px icon circle + title + desc,
 *                white card. Matches Maison's 4-card row.
 *
 * Each card may carry a `href` so the whole card becomes a tappable
 * navigation target — referenced widely in marketing layouts where the
 * card title doubles as the link.
 *
 * cardStyle: plain | outline | elevated (back-compat).
 * Hover lifts card 4px and bumps shadow.
 *
 * Phase-2 element-composition refactor: header (title/subtitle) and
 * per-card title / caption / description / imageUrl delegated to
 * HeadingElement / TextBodyElement / ImageElement. Card chrome
 * (border / shadow / hover-lift / icon glyph dispatch) and the
 * container-query grid stay — those are the block's structural
 * identity, not generic typography.
 */
interface FeaturesGridBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface FeatureItem {
  title: string;
  description?: string;
  iconName?: string;
  imageUrl?: string;
  /** Card link target. When set the entire card becomes <a>. */
  href?: string;
  /** Small label under the title — e.g. "4000+ projects" / "Shop Now" */
  caption?: string;
  /**
   * 카드 내용 아래 표시되는 버튼/링크. 운영자 지시 (2026-05-26):
   *   - buttonLabel + buttonHref 둘 다 있어야 노출
   *   - buttonStyle = 'button'  → 채워진 버튼 (filled variant)
   *   - buttonStyle = 'link'    → 텍스트 링크 (밑줄 + accent 색)
   *   - buttonStyle 미설정 / 'none' → 안 보임
   * 카드 전체에 href 가 있는 경우에도 내부 버튼은 독립 동작 (호버 시
   * 분리된 영역이며 클릭 이벤트는 stopPropagation 으로 카드 링크 막음).
   */
  buttonLabel?: string;
  buttonHref?: string;
  buttonStyle?: 'button' | 'link' | 'none';
  buttonNewTab?: boolean;
}

type Variant = 'compact' | 'image-card' | 'icon-large';

/**
 * Same palette / hex / var() / color-mix() resolution as
 * section-bg.ts's resolveSectionBgColor. Inlined here so the card
 * background prop accepts the same vocab operators already type into
 * Section Background ('primary' / 'accent' / '#hex' / etc.).
 */
const CARD_PALETTE_VAR: Record<string, string> = {
  primary:    'var(--accent, var(--dw-primary, currentColor))',
  secondary:  'var(--dw-secondary, currentColor)',
  accent:     'var(--accent, var(--dw-accent, currentColor))',
  background: 'var(--bg, var(--dw-background, transparent))',
  surface:    'var(--bg-subtle, var(--dw-surface, transparent))',
  text:       'var(--text-primary, var(--dw-text, currentColor))',
  muted:      'var(--text-muted, currentColor)',
  border:     'var(--border, currentColor)',
};

function resolveCardColor(raw: string): string {
  const v = raw.trim();
  if (!v) return 'var(--surface, #ffffff)';
  if (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl') ||
      v.startsWith('var(') || v.startsWith('color-mix(')) {
    return v;
  }
  return CARD_PALETTE_VAR[v] ?? `var(--${v}, currentColor)`;
}

export function FeaturesGridBlock({ props }: FeaturesGridBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const items = (Array.isArray(props.items) ? props.items : []) as FeatureItem[];
  const columns = ((props.columns as string) ?? '3') as '2' | '3' | '4';
  // How many cards per row on a phone-width section. Independent of the
  // desktop `columns` so a 4-col desktop grid can drop to 1 (or 2) on
  // mobile. Driven through a container query (see .b2b-cq-grid) so the
  // count is honoured in the 375px preview frame too, not just on a real
  // device — Tailwind's viewport breakpoints couldn't do that here.
  const mobileColumns = ((props.mobileColumns as string) ?? '1') as '1' | '2';
  const cardStyle = ((props.cardStyle as string) ?? 'outline') as 'plain' | 'outline' | 'elevated';
  const align = ((props.align as string) ?? 'left') as 'left' | 'center' | 'right';
  const variant = ((props.variant as string) ?? 'compact') as Variant;
  // bgMode controls the SECTION's background, not the card's. Cards
  // stay on a contrasting fill (var(--surface)) so they remain
  // readable when the section is 'dark' or 'accent'. Operator can
  // also override with a custom `backgroundColor` (palette key or hex)
  // — sectionBgStyle prefers it over bgMode.
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  // Card background — operator-set; defaults to var(--surface) (= white in
  // the default theme). Independent of the section background so a dark
  // section can host light cards (or vice-versa). Solves the cascade bug
  // where bgMode='dark' applied text-white globally, leaving white-on-
  // white text inside the (white) cards.
  const cardBackground = (props.cardBackground as string) || '';
  // 2026-05-25: SectionShell + applyLayout=true 로 마이그레이션 — 운영자가
  // LayoutField 의 Height/Align/Width/ContentWidth 바꾸면 즉시 반영.

  if (items.length === 0) return null;

  const cqVars = {
    '--cq-base': mobileColumns,
    '--cq-sm': '2',
    '--cq-lg': columns,
  } as React.CSSProperties;

  const cardBase: React.CSSProperties = {
    borderRadius: 'var(--r-md, 0.75rem)',
    // 운영자가 cardBackground 지정 시 그 색, 없으면 테마 surface (= 흰색).
    // resolveSectionBgColor 와 같은 palette key 해석 패턴 — 'primary' /
    // 'accent' / '#1a4d2e' / 'rgba(...)' 모두 받음.
    background: cardBackground ? resolveCardColor(cardBackground) : 'var(--surface, #ffffff)',
    // CSS color 강제 — 카드 안 텍스트가 section 의 text-white cascade 를
    // 무시하고 자기 surface 기준으로 그려지게. 운영자가 cardBackground
    // 를 dark 색으로 셋팅하면 elementStyles 로 카드별 color 재정의 가능.
    color: 'var(--text-primary, #111827)',
    transition: 'transform var(--duration-base, 0.2s) var(--ease-out, ease-out), box-shadow var(--duration-base, 0.2s) var(--ease-out, ease-out)',
    overflow: 'hidden',
  };
  const cardStyleProps: React.CSSProperties =
    cardStyle === 'elevated'
      ? { ...cardBase, boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.06))' }
      : cardStyle === 'plain'
        ? cardBase
        : { ...cardBase, border: '1px solid var(--border, #e5e7eb)' };

  return (
    <SectionShell
      props={props}
      className={`b2b-cq-host ${sectionBg.className}`.trim()}
      style={{ paddingBlock: 'var(--section-py-md, 4rem)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 2.5rem)' }}
      >
        {(eyebrow || title || subtitle) && (
          <header className="text-center">
            {eyebrow && (
              <EyebrowElement
                text={eyebrow}
                props={props}
                elementKey="eyebrow"
                className="mb-3"
              />
            )}
            <HeadingElement
              text={title}
              props={props}
              elementKey="title"
              defaultTag="h2"
              defaultSize="h2"
            />
            <TextBodyElement
              text={subtitle}
              props={props}
              elementKey="subtitle"
              defaultTag="p"
              defaultSize="h3"
              className="mt-3"
            />
          </header>
        )}

        <ul
          className={`b2b-cq-grid list-none p-0 m-0 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}`}
          style={cqVars}
        >
          {items.map((it, i) => (
            <FeatureCard
              key={i}
              item={it}
              index={i}
              variant={variant}
              align={align}
              parentProps={props}
              cardStyleProps={cardStyleProps}
            />
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

/* ─── card sub-component ─────────────────────────────────── */

function FeatureCard({
  item,
  index,
  variant,
  align,
  parentProps,
  cardStyleProps,
}: {
  item: FeatureItem;
  index: number;
  variant: Variant;
  align: 'left' | 'center' | 'right';
  parentProps: Record<string, unknown>;
  cardStyleProps: React.CSSProperties;
}) {
  const inner = (() => {
    if (variant === 'image-card') return <ImageCardContent item={item} index={index} parentProps={parentProps} />;
    if (variant === 'icon-large') return <IconLargeContent item={item} index={index} align={align} parentProps={parentProps} />;
    return <CompactContent item={item} index={index} align={align} parentProps={parentProps} />;
  })();

  // Whole-card link when href is set, plain <li> otherwise. The hover
  // animation (lift + shadow) is on the outer <li> so it fires whether
  // or not the card is wrapped in an <a>.
  return (
    <li
      style={cardStyleProps}
      className="hover:-translate-y-1 hover:shadow-md"
    >
      {item.href ? (
        <a
          data-element={`items[${index}].href`}
          href={item.href}
          className="block h-full no-underline text-current"
        >
          {inner}
        </a>
      ) : (
        <div className="h-full">{inner}</div>
      )}
    </li>
  );
}

/* ─── 1. compact (current default — small icon + text) ────── */

function CompactContent({
  item,
  index,
  align,
  parentProps,
}: {
  item: FeatureItem;
  index: number;
  align: 'left' | 'center' | 'right';
  parentProps: Record<string, unknown>;
}) {
  return (
    <div className="p-5 sm:p-8">
      <div
        className={align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : ''}
        style={{
          width: 48,
          height: 48,
          marginBottom: '1.25rem',
          borderRadius: 'var(--r-md, 0.5rem)',
          background: item.imageUrl ? undefined : 'var(--accent-soft, rgba(0,0,0,0.04))',
          color: 'var(--accent, currentColor)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {item.imageUrl ? (
          <ImageElement
            url={item.imageUrl}
            alt=""
            props={parentProps}
            elementKey={`items[${index}].imageUrl`}
            sizeCategory="avatar"
            baseStyle={{ width: 48, height: 48, objectFit: 'cover' }}
          />
        ) : item.iconName && ICONS[item.iconName] ? (
          <Icon name={item.iconName} size={26} data-element={`items[${index}].iconName`} />
        ) : (
          <BulletGlyph />
        )}
      </div>
      <HeadingElement
        text={item.title}
        props={parentProps}
        elementKey={`items[${index}].title`}
        defaultTag="h3"
        defaultSize="h4"
      />
      <TextBodyElement
        text={item.description || ''}
        props={parentProps}
        elementKey={`items[${index}].description`}
        defaultTag="p"
        defaultSize="body"
        className="mt-2"
      />
      <FeatureItemAction item={item} index={index} parentProps={parentProps} align={align} />
    </div>
  );
}

/* ─── 2. image-card (full-width image + body) ─────────────── */

function ImageCardContent({
  item,
  index,
  parentProps,
}: {
  item: FeatureItem;
  index: number;
  parentProps: Record<string, unknown>;
}) {
  return (
    <>
      <div
        className="relative w-full bg-gray-100 overflow-hidden"
        style={{ aspectRatio: '4 / 3' }}
        aria-hidden={!item.imageUrl}
      >
        {item.imageUrl ? (
          <ImageElement
            url={item.imageUrl}
            alt={item.title || ''}
            props={parentProps}
            elementKey={`items[${index}].imageUrl`}
            sizeCategory="card-grid"
            fillParent
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft,rgba(0,0,0,0.04))] to-transparent" />
        )}
      </div>
      <div className="p-4 sm:p-6">
        <HeadingElement
          text={item.title}
          props={parentProps}
          elementKey={`items[${index}].title`}
          defaultTag="h3"
          defaultSize="h4"
        />
        <TextBodyElement
          text={item.caption || ''}
          props={parentProps}
          elementKey={`items[${index}].caption`}
          defaultTag="p"
          defaultSize="caption"
          className="mt-1"
        />
        <TextBodyElement
          text={item.description || ''}
          props={parentProps}
          elementKey={`items[${index}].description`}
          defaultTag="p"
          defaultSize="body"
          className="mt-2"
        />
        <FeatureItemAction item={item} index={index} parentProps={parentProps} align="left" />
      </div>
    </>
  );
}

/* ─── 3. icon-large (centered 80px icon circle + body) ────── */

function IconLargeContent({
  item,
  index,
  align,
  parentProps,
}: {
  item: FeatureItem;
  index: number;
  align: 'left' | 'center' | 'right';
  parentProps: Record<string, unknown>;
}) {
  // Default to center alignment for this variant — Maison-style 4-card
  // rows put the icon centered above the title. Operator can opt back
  // into left alignment via the parent's align prop.
  const effectiveAlign = align;
  return (
    <div className={`p-5 sm:p-8 ${effectiveAlign === 'center' ? 'text-center' : effectiveAlign === 'right' ? 'text-right' : ''}`}>
      <div
        className={effectiveAlign === 'center' ? 'mx-auto' : effectiveAlign === 'right' ? 'ml-auto' : ''}
        style={{
          width: 80,
          height: 80,
          marginBottom: '1.5rem',
          borderRadius: '9999px',
          background: 'var(--accent-soft, rgba(0,0,0,0.04))',
          color: 'var(--accent, currentColor)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {item.imageUrl ? (
          <ImageElement
            url={item.imageUrl}
            alt=""
            props={parentProps}
            elementKey={`items[${index}].imageUrl`}
            sizeCategory="avatar"
            baseStyle={{ width: 48, height: 48, objectFit: 'contain' }}
          />
        ) : item.iconName && ICONS[item.iconName] ? (
          <Icon name={item.iconName} size={40} data-element={`items[${index}].iconName`} />
        ) : (
          <BulletGlyph size={32} />
        )}
      </div>
      <HeadingElement
        text={item.title}
        props={parentProps}
        elementKey={`items[${index}].title`}
        defaultTag="h3"
        defaultSize="h4"
      />
      <TextBodyElement
        text={item.description || ''}
        props={parentProps}
        elementKey={`items[${index}].description`}
        defaultTag="p"
        defaultSize="body"
        className="mt-3"
      />
      <FeatureItemAction item={item} index={index} parentProps={parentProps} align={effectiveAlign} />
    </div>
  );
}

/**
 * 카드 footer 의 버튼/링크 영역 — ButtonElement 단일 컴포넌트로 통일.
 * buttonStyle 가 'button' / 'link' 인지에 따라 ButtonElement 의 variant
 * (filled / link) 를 다르게 넘김. 별도 인라인 JSX 안 만들고 재사용
 * 컴포넌트 활용 (대표님 지시 2026-05-26).
 *
 * 카드 전체에 href 가 있을 때 (whole-card click) 도 내부 버튼은 독립
 * 동작 — 클릭 시 stopPropagation 으로 outer <a> 의 네비게이션을 막고
 * 자기 자신의 href 로 이동.
 */
function FeatureItemAction({
  item,
  index,
  parentProps,
  align,
}: {
  item: FeatureItem;
  index: number;
  parentProps: Record<string, unknown>;
  align: 'left' | 'center' | 'right';
}) {
  const label = (item.buttonLabel ?? '').trim();
  const href = (item.buttonHref ?? '').trim();
  if (!label || !href) return null;
  const style = item.buttonStyle ?? 'none';
  if (style === 'none') return null;
  const target: '_blank' | '_self' = item.buttonNewTab ? '_blank' : '_self';

  // 'link' → ButtonElement variant='link' (underline 텍스트), 'button' →
  // variant='filled' (채워진 버튼). 운영자가 elementVariants[items[i].
  // buttonLabel] 로 outlined / ghost 등 다른 variant 도 추가 swap 가능.
  const defaultVariant = style === 'link' ? 'link' : 'filled';

  return (
    <div
      className={`mt-4 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <ButtonElement
        text={label}
        href={href}
        target={target}
        props={parentProps}
        elementKey={`items[${index}].buttonLabel`}
        defaultVariant={defaultVariant}
      />
    </div>
  );
}

function BulletGlyph({ size = 20 }: { size?: number } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="10" cy="10" r="6" />
      <path d="M10 6v8M6 10h8" strokeLinecap="round" />
    </svg>
  );
}
