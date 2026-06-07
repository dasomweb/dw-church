// @dw-church/blocks/builder — utilities, icons, and types the page-builder
// inspector needs, WITHOUT re-exporting the static block components.
//
// The main index (`@dw-church/blocks`) re-exports VideoBlock / ImageGalleryBlock
// which import @dw-church/ui-components. When admin-app (vite) bundles that
// index from source, Rollup fails to resolve ui-components → build break. The
// inspector only needs the pure utility/icon/dynamic modules (all
// ui-components-free), so it imports from this narrow entry instead.
export type { ElementStyle } from './utilities/element-styles';
export { getElementStyle, mergeElementStyle, buildElementHoverCss } from './utilities/element-styles';
export { blockStyleToCss, isHiddenOnBreakpoint } from './utilities/block-style-resolver';
export { Icon } from './utilities/Icon';
export { ICONS, ICON_NAMES, isKnownIcon, type IconDef } from './icons/icons';
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
