import type { CSSProperties, ReactNode } from 'react';
import type { BlockStyle, BoxSides } from '@dw-church/design-tokens';
import { resolveColorToCss } from '@dw-church/design-tokens';

/**
 * Shared section wrapper for CONTENT (Data) blocks — sermons / bulletins /
 * columns / albums / staff / events / history / board / cell / newcomer.
 *
 * Data blocks paint their own <section> (background + padding), so a section
 * override applied by the outer BlockRenderer wrapper would either be hidden
 * behind this opaque background or double the padding. To make the operator's
 * 배경 / 오버레이 / 여백 controls (props.blockStyle, set on the Advanced tab)
 * actually take effect on content blocks, each data block renders its section
 * through DataSection, which reads props.blockStyle and applies:
 *   - background color   (override.background.color → else defaultBg)
 *   - background image   (override.background.image)
 *   - overlay layer      (override.overlay.color / opacity / blendMode)
 *   - padding / margin   (override.spacing — replaces the default padding)
 *
 * The outer BlockRenderer wrapper intentionally skips its own blockStyle CSS
 * for data blocks (see BlockRenderer.tsx) so there is exactly one owner of the
 * section chrome — here.
 */

// 수평 패딩만 유틸 클래스로; 수직은 --section-py-md 토큰(정적 블록 SectionShell 과
// 동일)으로 줘서 데이터/정적 블록의 상하 여백이 일치하게 한다(대표님: padding/margin
// 불일치 2026-09-06). blockStyle.spacing.padding 이 있으면 그게 우선.
const DEFAULT_PADDING = 'px-4 sm:px-6';

interface DataSectionProps {
  /** The block's props bag — DataSection reads props.blockStyle from it. */
  props: Record<string, unknown>;
  /** Section background when the operator hasn't set a background override. */
  defaultBg?: string;
  /** Padding utility classes used when no padding override is set. */
  paddingClassName?: string;
  /** Extra classes appended to the <section>. */
  className?: string;
  children: ReactNode;
}

/** A BoxSides has an explicit value on at least one side. */
function hasSides(b: BoxSides | undefined): b is BoxSides {
  return !!b && (b.top !== undefined || b.right !== undefined || b.bottom !== undefined || b.left !== undefined);
}

function boxShorthand(b: BoxSides): string {
  return `${b.top ?? 0}px ${b.right ?? 0}px ${b.bottom ?? 0}px ${b.left ?? 0}px`;
}

export function DataSection({ props, defaultBg, paddingClassName, className = '', children }: DataSectionProps) {
  const style = (props.blockStyle as BlockStyle | null | undefined) ?? null;
  // 커스텀 paddingClassName 을 넘긴 블록(예: featured_event 얇은 바)은 그 값을
  // 그대로 쓰고, 안 넘긴 기본 블록만 수평 클래스 + 수직 토큰(--section-py-md)을 쓴다.
  const useTokenVertical = !paddingClassName;
  const padClasses = paddingClassName ?? DEFAULT_PADDING;

  const bgColorRaw = style?.background?.color ? resolveColorToCss(style.background.color, '') : '';
  const bgColor = bgColorRaw && bgColorRaw !== 'inherit' ? bgColorRaw : undefined;
  const bgImage = style?.background?.image?.url;

  const padOverride = style?.spacing?.padding;
  const marginOverride = style?.spacing?.margin;
  const hasPad = hasSides(padOverride);

  const sectionStyle: CSSProperties = { position: 'relative' };
  // Background color: override wins, else the block's default surface.
  const resolvedBg = bgColor ?? defaultBg;
  if (resolvedBg) sectionStyle.backgroundColor = resolvedBg;
  if (bgImage) {
    sectionStyle.backgroundImage = `url(${bgImage})`;
    sectionStyle.backgroundSize = style?.background?.image?.size ?? 'cover';
    sectionStyle.backgroundPosition = style?.background?.image?.position ?? 'center';
    sectionStyle.backgroundRepeat = style?.background?.image?.repeat ?? 'no-repeat';
  }
  if (hasPad) sectionStyle.padding = boxShorthand(padOverride);
  else if (useTokenVertical) sectionStyle.paddingBlock = 'var(--section-py-md)'; // 토큰 세로 여백(정적 블록과 일치)
  if (hasSides(marginOverride)) sectionStyle.margin = boxShorthand(marginOverride);

  // Overlay layer — sits between background and content. Needs the section to
  // be position:relative (set above) and the content stacked above it.
  const overlay = style?.overlay;
  const overlayColorRaw = overlay?.color ? resolveColorToCss(overlay.color, '') : '';
  const overlayColor = overlayColorRaw && overlayColorRaw !== 'inherit' ? overlayColorRaw : undefined;
  const overlayStyle: CSSProperties | null = overlayColor
    ? {
        position: 'absolute',
        inset: 0,
        backgroundColor: overlayColor,
        opacity: overlay?.opacity ?? 1,
        ...(overlay?.blendMode ? { mixBlendMode: overlay.blendMode as CSSProperties['mixBlendMode'] } : {}),
        pointerEvents: 'none',
      }
    : null;

  // Padding utilities only when the operator hasn't overridden padding.
  const padClass = hasPad ? '' : padClasses;

  return (
    <section className={`${padClass} ${className}`.trim()} style={sectionStyle}>
      {overlayStyle && <div aria-hidden style={overlayStyle} />}
      {/* content stacks above the overlay */}
      <div className="relative">{children}</div>
    </section>
  );
}
