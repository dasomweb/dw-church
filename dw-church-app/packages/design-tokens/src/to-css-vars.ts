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
    vars[`--brand-${name}`] = `${spec.size.desktop}px`;
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

  // Breakpoints (informational; emitted as numbers without `px` for query usage).
  vars['--brand-bp-tablet'] = `${tokens.breakpoints.tablet}px`;
  vars['--brand-bp-mobile'] = `${tokens.breakpoints.mobile}px`;

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
    if (spec.size.mobile !== undefined && spec.size.mobile !== spec.size.desktop) {
      mobileLines.push(`  --brand-${name}: ${spec.size.mobile}px;`);
    }
    if (spec.size.tablet !== undefined && spec.size.tablet !== spec.size.desktop) {
      tabletLines.push(`  --brand-${name}: ${spec.size.tablet}px;`);
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
