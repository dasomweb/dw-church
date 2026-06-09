import { HeroBannerBlock } from '../static/HeroBannerBlock';
import { CtaSectionBlock } from '../static/CtaSectionBlock';
import { TextImageBlock } from '../static/TextImageBlock';
import { TextOnlyBlock } from '../static/TextOnlyBlock';
import { LocationMapBlock } from '../static/LocationMapBlock';
import { DividerBlock } from '../static/DividerBlock';
import { ImageGalleryBlock } from '../static/ImageGalleryBlock';
import { VideoBlock } from '../static/VideoBlock';
import { QuoteBlock } from '../static/QuoteBlock';
import { LogoTitleBlock } from '../static/LogoTitleBlock';
import { ButtonGroupBlock } from '../static/ButtonGroupBlock';
import { SubscribeFormBlock } from '../static/SubscribeFormBlock';
import { ContactFormBlock } from '../static/ContactFormBlock';
import { SpacerBlock } from '../static/SpacerBlock';
import { BeforeAfterBlock } from '../static/BeforeAfterBlock';
import { HotspotImageBlock } from '../static/HotspotImageBlock';
import { ShoppableImageBlock } from '../static/ShoppableImageBlock';
import { LookbookSliderBlock } from '../static/LookbookSliderBlock';
import { ProductDetailViewBlock } from '../static/ProductDetailViewBlock';
import { FormSplitBlock } from '../static/FormSplitBlock';
import { CatalogCoverBlock } from '../catalog/CatalogCoverBlock';
import { CatalogTocBlock } from '../catalog/CatalogTocBlock';
import { CatalogProductPageBlock } from '../catalog/CatalogProductPageBlock';
import { CatalogProductGalleryBlock } from '../catalog/CatalogProductGalleryBlock';
import { CatalogBackCoverBlock } from '../catalog/CatalogBackCoverBlock';
import { StatsCounterBlock } from '../list-based/StatsCounterBlock';
import { CountdownSaleBlock } from '../list-based/CountdownSaleBlock';
import { TimelineBlock } from '../list-based/TimelineBlock';
import { ComparisonTableBlock } from '../list-based/ComparisonTableBlock';
import { PricingTableBlock } from '../list-based/PricingTableBlock';
import { TeamMembersBlock } from '../list-based/TeamMembersBlock';
import { LogoBarBlock } from '../list-based/LogoBarBlock';
import { FaqAccordionBlock } from '../list-based/FaqAccordionBlock';
import { TestimonialsBlock } from '../list-based/TestimonialsBlock';
import { FeaturesGridBlock } from '../list-based/FeaturesGridBlock';
import { CheckListBlock } from '../list-based/CheckListBlock';
import { StepsListBlock } from '../list-based/StepsListBlock';
import { TabsBlock } from '../list-based/TabsBlock';
import { LayoutBlock } from '../layout/LayoutBlock';
// Church static blocks — dw-church domain blocks composed from the same
// element primitives, so the storefront AND the super-admin builder render
// them identically with full design-token (--brand-*) support.
import { PastorMessageBlock } from '../church/PastorMessageBlock';
import { NewcomerInfoBlock } from '../church/NewcomerInfoBlock';
import { WorshipScheduleBlock } from '../church/WorshipScheduleBlock';
import { blockStyleToCss } from './block-style-resolver';
import { buildElementHoverCss } from './element-styles';
import { placeholderResolveDynamicProps } from './dynamic-data';
import type { BlockStyle } from '@dw-church/design-tokens';

export type RenderableSection = {
  id: string;
  blockType: string;
  props: Record<string, unknown>;
  /**
   * Phase-1 per-section design override. When present, the BlockRenderer
   * wraps the block in a `<div style={blockStyleToCss(styleOverrides)}>` so
   * spacing / background / border / shadow / size / alignment / typography
   * land at the section level without each block knowing about overrides.
   */
  styleOverrides?: BlockStyle | null;
  sortOrder?: number;
  isVisible?: boolean;
};

/**
 * Sync block component — used by the admin canvas BlockRenderer below.
 * The admin canvas only renders blocks whose data is in props (no
 * fetching), so React.FC's sync return constraint is fine.
 */
export type SyncBlockComponent = React.FC<{ props: Record<string, unknown>; slug: string }>;

/**
 * Public BlockComponent type for storefront BlockRenderer (apps/web).
 * Storefront extends SHARED_BLOCK_MAP with async Server Components
 * that fetch from /api/v1/... — RecentBlogPostsBlock, BoardBlock,
 * BannerSliderBlock, etc. — so the type widens to include
 * `Promise<ReactNode>` returns.
 *
 * The admin BLOCK_MAP below uses SyncBlockComponent (the narrower
 * type), so admin canvas never accidentally tries to render an async
 * component as JSX. Storefront BlockRenderer accepts the spread of
 * SHARED_BLOCK_MAP (sync) plus its own async additions because the
 * union widening is safe.
 */
export type BlockComponent =
  | SyncBlockComponent
  | ((props: { props: Record<string, unknown>; slug: string }) => Promise<React.ReactNode>);

/**
 * B2B Smart admin-canvas block-type → React component map. All entries
 * are sync (typed via SyncBlockComponent) because the admin canvas
 * doesn't fetch data — it renders blocks directly from props with mock
 * placeholders for data blocks. Storefront BlockRenderer (apps/web)
 * spreads this map and adds async Server Components for data blocks.
 */
/**
 * Admin-canvas placeholder for data blocks (banner_slider /
 * recent_blog_posts / album_gallery / board / products_showcase /
 * contact_info / catalog_archive / catalog_showcase) — these are async
 * Server Components in apps/web that fetch from /api/v1/... and have
 * no sync render path. Without an entry in BLOCK_MAP the BlockRenderer
 * returned null in production builds → 운영자가 섹션 추가 후 캔버스에
 * 아무것도 안 보이는 버그 (대표님 2026-05-26).
 *
 * placeholder 는 운영자에게 "이 블록은 사이트에서 데이터 fetch 후 렌더"
 * 라는 사실을 알려주는 카드. block 라벨 + 안내 문구만.
 */
const dataBlockPlaceholder = (label: string): SyncBlockComponent => function DataBlockPlaceholder() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-6 py-8 text-center">
        <div className="text-xs font-mono uppercase tracking-wider text-blue-600 mb-2">
          {label}
        </div>
        <div className="text-sm text-blue-800">
          Data block — the live site (storefront) fetches and renders this data automatically.
        </div>
        <div className="text-[11px] text-blue-600/70 mt-1">
          The editor preview looks empty, but the real data appears once published.
        </div>
      </div>
    </div>
  );
};

export const BLOCK_MAP: Record<string, SyncBlockComponent> = {
  hero_banner:      HeroBannerBlock,
  hero_full_width:  HeroBannerBlock,

  hero_split:        TextImageBlock,
  business_intro:    TextImageBlock,
  mission_vision:    TextOnlyBlock,

  text_image:   TextImageBlock,
  text_only:    TextOnlyBlock,
  quote_block:  QuoteBlock,
  logo_title:   LogoTitleBlock,
  button_group: ButtonGroupBlock,

  location_map:  LocationMapBlock,
  map_embed:     LocationMapBlock,

  image_gallery: ImageGalleryBlock,
  video:         VideoBlock,

  // Dedicated CTA block — 5 variants. `call_to_action` legacy rows
  // route here too; CtaSectionBlock's resolveVariant() handles old
  // hero_banner-style props gracefully so existing tenants don't
  // visually regress on the swap.
  cta_section:       CtaSectionBlock,
  call_to_action:    CtaSectionBlock,
  newsletter_signup: TextOnlyBlock,

  layout_row:     LayoutBlock,
  layout_columns: LayoutBlock,
  layout_section: LayoutBlock,
  two_columns:    LayoutBlock,
  three_columns:  LayoutBlock,
  tabs:           LayoutBlock,
  accordion:      LayoutBlock,

  divider:        DividerBlock,
  section_header: TextOnlyBlock,
  spacer:            SpacerBlock,
  timeline:          TimelineBlock,
  contact_form:      ContactFormBlock,
  comparison_table:  ComparisonTableBlock,
  before_after:      BeforeAfterBlock,
  hotspot_image:     HotspotImageBlock,
  // Catalog blocks. shoppable_image's admin/base render shows the
  // numbered dots + label; the storefront overrides it with an async
  // product-resolving variant. lookbook_slider / countdown_sale are
  // identical on canvas and storefront (no data fetch).
  shoppable_image:   ShoppableImageBlock,
  lookbook_slider:   LookbookSliderBlock,
  countdown_sale:    CountdownSaleBlock,
  // Catalog magazine pages — each is one A5 landscape spread.
  catalog_cover:           CatalogCoverBlock,
  catalog_toc:             CatalogTocBlock,
  catalog_product_page:    CatalogProductPageBlock,
  catalog_product_gallery: CatalogProductGalleryBlock,
  catalog_back_cover:      CatalogBackCoverBlock,

  stats_counter:   StatsCounterBlock,
  pricing_table:   PricingTableBlock,
  team_members:    TeamMembersBlock,
  subscribe_form:  SubscribeFormBlock,
  logo_bar:        LogoBarBlock,
  faq_accordion:   FaqAccordionBlock,
  testimonials:    TestimonialsBlock,
  features_grid:   FeaturesGridBlock,
  check_list:      CheckListBlock,
  steps_list:      StepsListBlock,
  process_steps:   StepsListBlock,
  // `tabs` is already mapped above to the layout-container tabs (children
  // blocks per tab — different shape). This block_type is the category
  // filter + card grid pattern from Stanislav Bau's "Unsere Kategorien".
  category_tabs:   TabsBlock,
  tabs_filter:     TabsBlock,

  // 템플릿 페이지 전용 — admin 캔버스에서 커머스 2-column 레이아웃을
  // sample 데이터로 미리보기. storefront BlockRenderer 는 이 entry 를
  // async ProductDetailViewBlock (productSlug fetch) 로 override 하므로
  // 실제 사이트는 영향 없음 (대표님 2026-05-28).
  product_detail_view: ProductDetailViewBlock,

  // 2-column: 좌 테넌트 양식 + 우 타이틀·서브타이틀·콘텐츠 (대표님 2026-05-29).
  // admin 캔버스는 양식 placeholder 미리보기; storefront 가 async 버전으로
  // override 해서 실제 양식 fetch/렌더.
  form_split: FormSplitBlock,

  // ── Church static blocks (dw-church domain) ──────────────────────────
  // Operator-entered content → render fully in-process on both surfaces.
  pastor_message:    PastorMessageBlock,
  church_intro:      PastorMessageBlock,
  newcomer_info:     NewcomerInfoBlock,
  visitor_welcome:   NewcomerInfoBlock,
  worship_schedule:  WorshipScheduleBlock,
  worship_times:     WorshipScheduleBlock,
};

interface BlockRendererProps {
  section: RenderableSection;
  slug: string;
  /**
   * Ambient flag the editor sets so blocks can opt into edit-mode
   * affordances (data-edit-element attributes, etc). Storefront passes
   * undefined / false. Block components are free to ignore it; this
   * keeps the visual identical between the two contexts.
   */
  editorMode?: boolean;
  /**
   * Reported when a block's element is clicked in editor mode. Used by
   * the admin to open the per-element properties panel. Storefront
   * doesn't pass this.
   */
  onElementClick?: (sectionId: string, elementKey: string) => void;
}

/**
 * Auto-recover live data from the dropped free-form "Content Alignment"
 * / "Position" buttons. Those wrote display:flex + flexDirection:column
 * + alignItems:flex-start|center|flex-end + textAlign onto the section
 * wrapper to convey horizontal text alignment, but the flex container
 * collapsed the inner block to content-width — a visible viewport-half
 * crop on hero / cta backgrounds. Strip the offending CSS keys (keep
 * textAlign — it's the part the operator actually intended); padding /
 * margin / background / border / etc. pass through untouched.
 */
function stripLegacyFlexAlignment(
  style: React.CSSProperties | undefined,
): React.CSSProperties | undefined {
  if (!style) return style;
  const isLegacyShape =
    style.display === 'flex' &&
    style.flexDirection === 'column' &&
    (style.alignItems === 'flex-start' ||
      style.alignItems === 'center' ||
      style.alignItems === 'flex-end');
  if (!isLegacyShape) return style;
  const { display: _d, flexDirection: _f, alignItems: _a, justifyContent: _j, ...rest } = style;
  return rest;
}

// 데이터 블록 (banner_slider / recent_blog_posts / album_gallery /
// board / products_showcase / recent_products / contact_info /
// catalog_archive / catalog_showcase) — admin BLOCK_MAP 에 sync 컴포넌트가
// 없어서 production 빌드에서 null 반환되던 케이스를 dataBlockPlaceholder
// 로 보호. dev 모드에서는 'Unknown block type' 까지 떴지만 prod 에서는
// 그냥 사라져 운영자가 '추가됐는데 캔버스 빈 상태' 로 혼란 (2026-05-26).
const DATA_BLOCK_LABELS: Record<string, string> = {
  banner_slider: 'Banner Slider',
  hero_image_slider: 'Banner Slider',
  recent_blog_posts: 'Recent Blog Posts',
  album_gallery: 'Album Gallery',
  board: 'Board',
  products_showcase: 'Products Showcase',
  recent_products: 'Recent Products',
  contact_info: 'Contact Info',
  address_info: 'Address Info',
  catalog_archive: 'Catalog Archive',
  catalog_showcase: 'Catalog Showcase',
  // 템플릿 페이지 전용 dynamic 블록 — storefront 라우트에서 product/post
  // 가 inject 된 후 렌더. blog_post_view 는 admin 캔버스에 데이터 없으니
  // placeholder 안내 (운영자 인스펙터 편집은 그대로 가능). product_detail_view
  // 는 BLOCK_MAP 에 sync 미리보기가 있어 여기서 제외 (2026-05-28).
  blog_post_view: 'Blog Post View (rendered automatically on the storefront /blog/<slug>)',
  application_form_embed: 'Application Form Embed',
};

export function BlockRenderer({ section, slug, editorMode, onElementClick }: BlockRendererProps) {
  const Component = BLOCK_MAP[section.blockType]
    ?? (DATA_BLOCK_LABELS[section.blockType]
      ? dataBlockPlaceholder(DATA_BLOCK_LABELS[section.blockType]!)
      : undefined);

  // Admin 캔버스 / 미리보기 — dynamic ref 를 `[Source Label]` placeholder
  // 문자열로 swap. 일반 블록 컴포넌트가 .split() / .trim() 같은 string
  // 메서드를 호출하다 dynamic ref 객체에서 터지는 걸 막음 (대표님 보고
  // 2026-05-27 "미리보기 렌더 오류 e.split is not a function" 의 fix).
  // storefront 는 라우터에서 이미 실제 데이터로 resolveDynamicProps 통과
  // 한 후 BlockRenderer 에 도달하므로 이 호출이 no-op.
  const resolvedProps = placeholderResolveDynamicProps(section.props ?? {}) as typeof section.props;

  if (!Component) {
    // 정말로 알 수 없는 block_type — 운영자가 잘못된 type 으로 추가했거나
    // registry / BLOCK_MAP 의 불일치. dev/prod 무관하게 안내 카드 표시
    // (이전엔 prod 에서 null 반환 → 빈 화면).
    return (
      <div className="mx-auto max-w-7xl border border-dashed border-yellow-400 bg-yellow-50 px-6 py-4 text-sm text-yellow-700">
        Unknown block type: <code>{section.blockType}</code>
      </div>
    );
  }

  // Operator-set box model overrides (padding / margin / border /
  // background / max-width). Two stacked sources merge here:
  //   - section.props.containerStyle  → legacy free-form CSSProperties.
  //   - section.styleOverrides        → Phase-1 typed BlockStyle.
  // BlockStyle wins on conflicting keys (it's the typed, validated path).
  // Wrapping happens once with the merged result so every block gets the
  // same outer-shell behavior without each component re-implementing it.
  const rawContainerStyle = (resolvedProps as { containerStyle?: React.CSSProperties }).containerStyle;
  const containerStyle = stripLegacyFlexAlignment(rawContainerStyle);
  const overrideStyle = blockStyleToCss(section.styleOverrides);
  const mergedStyle: React.CSSProperties = { ...containerStyle, ...overrideStyle };
  // Hover-state CSS for elements inside this section. Operator sets
  // `elementStyles['title:hover']` etc. via the inspector's Hover
  // toggle; we compile it into a stylesheet block scoped by
  // [data-section-id="X"]. Inline styles can't carry :hover so this
  // is the only path that works for per-element pseudo-states.
  const hoverCss = buildElementHoverCss(section.id, resolvedProps as never);
  const hasHover = hoverCss.length > 0;
  // Always wrap (with data-section-id) so hover selectors always
  // resolve. The wrapper is otherwise lightweight when no inline
  // container style is needed.
  const hasWrapper = Object.keys(mergedStyle).length > 0 || hasHover;
  const wrap = (children: React.ReactNode) =>
    hasWrapper ? (
      <div data-section-id={section.id} style={mergedStyle}>
        {hasHover && <style dangerouslySetInnerHTML={{ __html: hoverCss }} />}
        {children}
      </div>
    ) : (
      <>{children}</>
    );

  // Editor mode: wrap in a click-capturing div and stamp data-section-id
  // so the admin can resolve clicks back to the right section. The block
  // itself stays unchanged so the storefront and editor render are visually
  // identical pixel-for-pixel.
  if (editorMode && onElementClick) {
    return (
      <div
        data-section-id={section.id}
        data-section-block-type={section.blockType}
        onClick={(e) => {
          // Walk up from the click target to the nearest [data-element].
          // If found, it's an element edit. Otherwise it's a section-level click.
          let el: HTMLElement | null = e.target as HTMLElement;
          while (el && el !== e.currentTarget) {
            const key = el.getAttribute('data-element');
            if (key) {
              e.stopPropagation();
              onElementClick(section.id, key);
              return;
            }
            el = el.parentElement;
          }
          onElementClick(section.id, '__section__');
        }}
        style={{ cursor: 'default' }}
      >
        {wrap(<Component props={resolvedProps} slug={slug} />)}
      </div>
    );
  }

  return wrap(<Component props={resolvedProps} slug={slug} />);
}
