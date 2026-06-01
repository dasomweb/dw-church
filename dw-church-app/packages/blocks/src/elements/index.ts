/**
 * Reusable element modules — composed by blocks instead of hand-rolling
 * `<h2 data-element="title">…` inline. Each module:
 *   - stamps data-element + data-element-type so the inspector can
 *     dispatch type-specific controls (heading vs text-body),
 *   - reads operator's elementTags[key] to swap the HTML tag,
 *   - reads operator's elementStyles[key] via mergeElementStyle,
 *   - defaults to --brand-{scale}-* tokens so the theme typography
 *     panel drives every instance.
 *
 * Block authors call these like primitives — see TextOnlyBlock for the
 * canonical composition pattern.
 */
export { HeadingElement } from './HeadingElement';
export type { HeadingTag, HeadingSizeToken } from './HeadingElement';
export { TextBodyElement } from './TextBodyElement';
export type { TextBodyTag } from './TextBodyElement';
export { ButtonElement } from './ButtonElement';
export type { ButtonVariant } from './ButtonElement';
export { EyebrowElement } from './EyebrowElement';
export { ImageElement } from './ImageElement';
export { SectionBackground, objectPositionFor } from './SectionBackground';
export type {
  SectionBackgroundPosition,
  SectionBackgroundProps,
  OverlayConfig,
  OverlayMode,
  OverlayGradientType,
} from './SectionBackground';
