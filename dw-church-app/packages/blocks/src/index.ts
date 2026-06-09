/**
 * @dw-church/blocks — single source of truth for storefront block
 * components. Both the live storefront (apps/web) and the admin
 * PageBuilder editor (packages/admin-app) render through this package
 * so what you see in the editor is *literally* what you ship.
 *
 * Blocks here are framework-agnostic: no `next/image`, no
 * `next/navigation`. The trade-off is no Image-component optimization,
 * which the editor doesn't need anyway and the storefront accepts as
 * the price of unification.
 *
 * Source organization (since the May 2026 split):
 *   static/      — props-driven, single content unit per block
 *   list-based/  — renders a list/grid of items from props.items
 *   layout/      — container blocks with children[]
 *   utilities/   — BlockRenderer, style resolvers, element-style helpers
 */

// Central block registry — single source of truth for block_type metadata
export {
  BLOCK_REGISTRY,
  BLOCK_GROUPS,
  BLOCK_TYPES,
  getPaletteBlocks,
  getDefaultProps,
  getAiHint,
  isKnownBlockType,
  type BlockDefinition,
  type BlockFlags,
  type BlockGroup,
  type BlockType,
} from './registry';

// Style + render utilities
export type { ElementStyle } from './utilities/element-styles';
export { getElementStyle, mergeElementStyle, buildElementHoverCss } from './utilities/element-styles';
export { blockStyleToCss, isHiddenOnBreakpoint } from './utilities/block-style-resolver';
export { buildTypographyCss } from './utilities/typography-css';
export { imgAttrs, srcSetFor, imageSizesFor, type ImageSlot } from './utilities/responsive-image';
export {
  DYNAMIC_MARKER,
  isDynamicRef,
  resolveDynamicProps,
  placeholderResolveDynamicProps,
  DYNAMIC_SOURCES,
  dynamicRefLabel,
  makeDynamicRef,
  dynamicContextsForPageKind,
  type DynamicRef,
  type DynamicContext,
  type DynamicSourceOption,
  type ResolveContexts,
} from './utilities/dynamic-data';
export { Icon } from './utilities/Icon';
export { ICONS, ICON_NAMES, isKnownIcon, type IconDef } from './icons/icons';

// Element primitives — apps/web 측 데이터 블록 (ProductsShowcaseBlock 등)
// 이 자체 텍스트 슬롯을 토큰 기본 (--fs-* / --text-*) + elementStyles
// override (운영자 인스펙터의 폰트 사이즈 / 컬러 / 굵기 컨트롤) 로 그리도록.
export {
  HeadingElement,
  TextBodyElement,
  ButtonElement,
  EyebrowElement,
  ImageElement,
} from './elements';
export type { HeadingTag, HeadingSizeToken, TextBodyTag, ButtonVariant } from './elements';

// Static blocks — render purely from props (no items array, no fetching)
export { HeroBannerBlock } from './static/HeroBannerBlock';
export { TextImageBlock } from './static/TextImageBlock';
export { TextOnlyBlock } from './static/TextOnlyBlock';
export { LocationMapBlock } from './static/LocationMapBlock';
export { DividerBlock } from './static/DividerBlock';
export { ImageGalleryBlock } from './static/ImageGalleryBlock';
export { VideoBlock } from './static/VideoBlock';
export { QuoteBlock } from './static/QuoteBlock';
export { LogoTitleBlock } from './static/LogoTitleBlock';
export { ButtonGroupBlock } from './static/ButtonGroupBlock';
export { DirectionsSplitBlock } from './static/DirectionsSplitBlock';
export { ScheduleSplitBlock } from './static/ScheduleSplitBlock';
export { SubscribeFormBlock } from './static/SubscribeFormBlock';
export { ShoppableImageBlock } from './static/ShoppableImageBlock';
export { LookbookSliderBlock } from './static/LookbookSliderBlock';
export { ProductDetailViewBlock } from './static/ProductDetailViewBlock';
export { FormSplitBlock } from './static/FormSplitBlock';

// List-based blocks — render an array of items from props
export { StatsCounterBlock } from './list-based/StatsCounterBlock';
export { CountdownSaleBlock } from './list-based/CountdownSaleBlock';
export { PricingTableBlock } from './list-based/PricingTableBlock';
export { TeamMembersBlock } from './list-based/TeamMembersBlock';
export { LogoBarBlock } from './list-based/LogoBarBlock';
export { FaqAccordionBlock } from './list-based/FaqAccordionBlock';
export { TestimonialsBlock } from './list-based/TestimonialsBlock';
export { FeaturesGridBlock } from './list-based/FeaturesGridBlock';
export { CheckListBlock } from './list-based/CheckListBlock';
export { StepsListBlock } from './list-based/StepsListBlock';
export { TabsBlock } from './list-based/TabsBlock';

// Layout blocks — containers with children[]
export { LayoutBlock } from './layout/LayoutBlock';

// Catalog magazine pages (Track C — A5 print-style spreads)
export { CatalogCoverBlock } from './catalog/CatalogCoverBlock';
export { CatalogTocBlock } from './catalog/CatalogTocBlock';
export { CatalogProductPageBlock } from './catalog/CatalogProductPageBlock';
export { CatalogProductGalleryBlock } from './catalog/CatalogProductGalleryBlock';
export { CatalogBackCoverBlock } from './catalog/CatalogBackCoverBlock';
export { expandAutoGallerySpreads } from './utilities/catalog-auto-gallery';
export {
  CATALOG_SPREAD_ASPECT,
  CATALOG_SPREAD_CLASS,
  CATALOG_SPREAD_PAD,
} from './utilities/catalog-page';

// Data-fetching blocks (banner_slider, recent_blog_posts, album_gallery,
// board, contact_info) live in apps/web because they import the
// storefront's @/lib/api fetchers. The editor preview substitutes a
// "데이터 블록 — 미리보기 미지원" placeholder for these, which is
// fine because they have no static visual to author anyway.
export { BlockRenderer, BLOCK_MAP, type BlockComponent, type RenderableSection } from './utilities/BlockRenderer';
