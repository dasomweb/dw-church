/**
 * tokens → CSS custom property emit.
 *
 * Two outputs:
 *   - tokensToCssVars(tokens) — { "--brand-primary": "#2563eb", ... }
 *     suitable for inline style or template literal injection.
 *   - tokensToCssText(tokens, scope?) — fully formed CSS rule string,
 *     `:root { ... }` or `${scope} { ... }` for scoped preview.
 *
 * Phase 0 emits desktop sizes only. Phase 2 will add @media (max-width: ...)
 * blocks for tablet / mobile size scales via `tokensToCssText` extending the
 * output with media-query rules.
 */
import type { DesignTokens, TypographyScaleName } from './schema.js';
import { paletteWithFg } from './contrast.js';

export type CssVarMap = Record<string, string>;

const SCALE_KEYS: ReadonlyArray<TypographyScaleName> = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'body', 'caption', 'overline', 'label', 'button',
];

/**
 * 한글 가독 하한 — 저장된 토큰이 이보다 작아도 하한까지 올려서 내보낸다.
 *
 * 왜 클램프가 필요한가. 한글 음절은 em 박스를 거의 꽉 채우고 그 안에 자모 2~4개가
 * 들어가므로, 12px 에서는 받침(ㄺ·ㅄ·ㅀ)의 획 간격이 1px 아래로 내려가 뭉친다.
 * 가독 하한이 라틴보다 *높다*. 그런데 한글 하한을 세우기 전에 저장된 스냅샷(구
 * compact 프리셋: 본문 15 / 캡션 12 등)이 그대로 남아 있어, 그 테넌트는 사이트
 * 전체가 한 단계 작게 렌더됐다(yedam 에서 실제로 발생). 프리셋을 고쳐도 이미 저장된
 * 값은 바뀌지 않으므로, 내보내는 쪽에서 하한을 건다 — 데이터 마이그레이션 없이
 * 전 테넌트가 복구된다. 운영자가 일부러 11px 한글을 고르는 경우는 없다고 본다.
 *
 * 하한을 넘는 값은 손대지 않으므로 large/xlarge 선택은 그대로 유지된다.
 */
const KOREAN_MIN_PX: Partial<Record<TypographyScaleName, number>> = {
  // 읽는 텍스트
  body: 16,
  h5: 16,
  // 보조 텍스트 (라벨·캡션·버튼)
  h6: 13,
  caption: 13,
  overline: 13,
  label: 13,
  button: 14,
};

/** 역할의 한글 하한까지 끌어올린 px. 하한이 없는 역할(h1~h4)은 그대로. */
export function koreanFloorPx(name: TypographyScaleName, px: number): number {
  const min = KOREAN_MIN_PX[name];
  return min !== undefined && px < min ? min : px;
}

/** Flatten DesignTokens into a `--brand-*` CSS variable map. */
export function tokensToCssVars(tokens: DesignTokens): CssVarMap {
  const vars: CssVarMap = {};

  // Colors — system slots + WCAG AA-paired foregrounds (Phase-4) +
  // custom keys. paletteWithFg picks `${slot}-fg` from the same palette's
  // text/background/surface candidates first, then white/near-black
  // fallbacks. Operator-supplied custom `{slot}-fg` keys win.
  const augmented = paletteWithFg(tokens.colors.system);
  for (const [slot, hex] of Object.entries(augmented)) {
    vars[`--brand-${slot}`] = hex;
  }
  for (const [name, hex] of Object.entries(tokens.colors.custom)) {
    vars[`--brand-${name}`] = hex;
  }

  // Typography families.
  vars['--brand-font-heading'] = tokens.typography.families.heading;
  vars['--brand-font-body'] = tokens.typography.families.body;
  vars['--brand-font-korean'] = tokens.typography.families.korean;

  // Typography scales (desktop only in Phase 0).
  for (const name of SCALE_KEYS) {
    const spec = tokens.typography.scales[name];
    if (!spec) continue;
    vars[`--brand-${name}`] = `${koreanFloorPx(name, spec.size.desktop)}px`;
    vars[`--brand-${name}-weight`] = String(spec.weight);
    vars[`--brand-${name}-line-height`] = String(spec.lineHeight);
    if (spec.letterSpacing !== undefined) {
      vars[`--brand-${name}-letter-spacing`] = `${spec.letterSpacing}px`;
    }
    if (spec.transform) {
      vars[`--brand-${name}-transform`] = spec.transform;
    }
  }

  // Shadows.
  for (const [preset, value] of Object.entries(tokens.shadows)) {
    vars[`--brand-shadow-${preset}`] = value;
  }

  // Radius.
  vars['--brand-radius-sm'] = `${tokens.radius.sm}px`;
  vars['--brand-radius-md'] = `${tokens.radius.md}px`;
  vars['--brand-radius-lg'] = `${tokens.radius.lg}px`;
  vars['--brand-radius-full'] = `${tokens.radius.full}px`;

  // Container + spacing.
  vars['--brand-container-max'] = `${tokens.containerMax}px`;
  vars['--brand-section-py'] = `${tokens.spacing.sectionPaddingY}px`;
  vars['--brand-container-px'] = `${tokens.spacing.containerPaddingX}px`;
  vars['--brand-gap-grid'] = `${tokens.spacing.gapGrid}px`;

  // ── Bridge spacing tokens → the vars blocks actually consume ──
  // Every block reads --section-py-{sm,md,lg,xl} and --gap-grid (defined as
  // fixed clamp() fallbacks in blocks/styles.css). Before this, the spacing
  // tokens (--brand-section-py etc.) were emitted but NOTHING read them, so
  // changing sectionPaddingY — via the theme editor OR the AI builder — had
  // zero visible effect. Derive a responsive scale from the single
  // sectionPaddingY (the "md" desktop target) and emit the names blocks read.
  // Emitted inside the tenant scope, so they override the :root fallback.
  const py = tokens.spacing.sectionPaddingY;
  // clamp(min, fluid, max): mobile shrinks to ~0.6×, desktop hits the token.
  const pyScale = (mult: number, vw: number): string => {
    const max = Math.round(py * mult);
    const min = Math.round(max * 0.6);
    return `clamp(${min}px, ${vw}vw, ${max}px)`;
  };
  vars['--section-py-sm'] = pyScale(0.65, 6);
  vars['--section-py-md'] = pyScale(1, 8);
  vars['--section-py-lg'] = pyScale(1.4, 10);
  vars['--section-py-xl'] = pyScale(1.8, 12);
  vars['--gap-grid'] = `${tokens.spacing.gapGrid}px`;
  vars['--container-px'] = `${tokens.spacing.containerPaddingX}px`;
  // Theme-level vertical margin between sections (SectionShell reads --section-my).
  vars['--section-my'] = `${tokens.spacing.sectionMarginY ?? 0}px`;

  // Breakpoints (informational; emitted as numbers without `px` for query usage).
  vars['--brand-bp-tablet'] = `${tokens.breakpoints.tablet}px`;
  vars['--brand-bp-mobile'] = `${tokens.breakpoints.mobile}px`;

  // Header chrome — logo height + nav font size. `?? default` guards token
  // blobs persisted before `header` existed (they reach here unparsed via
  // getThemeTokens' projection, which now backfills, but the fallback keeps
  // this emit safe regardless). Consumed by the storefront header.
  vars['--brand-logo-height'] = `${tokens.header?.logoHeight ?? 40}px`;
  // 한글 메뉴 라벨 하한 15px — 라틴 14px 과 같은 체감이 아니다.
  vars['--brand-nav-font-size'] = `${Math.max(15, tokens.header?.navFontSize ?? 15)}px`;
  vars['--brand-nav-font-weight'] = `${tokens.header?.navFontWeight ?? 500}`;

  // Button design (shape → radius, padding, shadow). Consumed by ButtonElement.
  // Defaults reproduce the prior hardcoded fallbacks so tenants that never set a
  // button design are unchanged: shape 'rounded' with no explicit radius emits a
  // reference to --brand-radius-md (exactly what ButtonElement used before);
  // padding 20/10 = the old 1.25rem/0.625rem; shadow none.
  const btn = tokens.button;
  const btnShape = btn?.shape ?? 'rounded';
  vars['--brand-button-radius'] =
    btnShape === 'pill' ? '9999px'
      : btnShape === 'square' ? '0px'
        : (typeof btn?.radius === 'number' ? `${btn.radius}px` : 'var(--brand-radius-md, 8px)');
  vars['--brand-button-pad-x'] = `${btn?.paddingX ?? 20}px`;
  vars['--brand-button-pad-y'] = `${btn?.paddingY ?? 10}px`;
  vars['--brand-button-shadow'] = btn?.shadow ? '0 8px 24px rgba(0,0,0,0.12)' : 'none';

  return vars;
}

/** Render a CSS rule block (`:root { ... }` or scoped). */
export function tokensToCssText(tokens: DesignTokens, scope = ':root'): string {
  const vars = tokensToCssVars(tokens);
  const declarations = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  let css = `${scope} {\n${declarations}\n}\n`;

  // Phase 2: extend with mobile / tablet media query blocks for size scales.
  // For now, emit a basic mobile fallback so storefront responsiveness isn't
  // entirely lost — only for scales that have an explicit mobile size.
  const mobileLines: string[] = [];
  const tabletLines: string[] = [];
  for (const name of SCALE_KEYS) {
    const spec = tokens.typography.scales[name];
    if (!spec) continue;
    // Both blocks are max-width queries, so the tablet block ALSO matches
    // mobile widths and cascades down. The mobile override must therefore be
    // compared against the value active just above it — the tablet value (or
    // desktop when no tablet override) — NOT against desktop. Otherwise, when
    // mobile === desktop but tablet differs (e.g. h1 {mobile:42, tablet:56,
    // desktop:42}), the mobile block was skipped and the tablet 56px leaked
    // onto phones (bigger on mobile than desktop). Emit mobile whenever it
    // differs from the tablet-effective value so it correctly restores it.
    const deskEff = koreanFloorPx(name, spec.size.desktop);
    const tabletEff = spec.size.tablet !== undefined ? koreanFloorPx(name, spec.size.tablet) : deskEff;
    const mobileEff = spec.size.mobile !== undefined ? koreanFloorPx(name, spec.size.mobile) : undefined;
    if (mobileEff !== undefined && mobileEff !== tabletEff) {
      mobileLines.push(`  --brand-${name}: ${mobileEff}px;`);
    }
    if (spec.size.tablet !== undefined && tabletEff !== deskEff) {
      tabletLines.push(`  --brand-${name}: ${tabletEff}px;`);
    }
  }
  if (tabletLines.length > 0) {
    css += `\n@media (max-width: ${tokens.breakpoints.tablet}px) {\n  ${scope} {\n  ${tabletLines.join('\n  ')}\n  }\n}\n`;
  }
  if (mobileLines.length > 0) {
    css += `\n@media (max-width: ${tokens.breakpoints.mobile}px) {\n  ${scope} {\n  ${mobileLines.join('\n  ')}\n  }\n}\n`;
  }

  return css;
}
