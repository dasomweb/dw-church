import { describe, it, expect } from 'vitest';
import {
  designTokensSchema,
  blockStyleSchema,
  DEFAULT_DESIGN_TOKENS,
  FONT_SIZE_PRESETS,
  SPACING_PRESETS,
  tokensToCssVars,
  tokensToCssText,
  relativeLuminance,
  contrastRatio,
  pickForeground,
  paletteWithFg,
  resolveColorToHex,
  resolveColorToCss,
  legacyThemeToTokens,
  applyFontSizePreset,
  applySpacingPreset,
  detectFontSizePreset,
  detectSpacingPreset,
  koreanFloorPx,
} from '../index.js';
import type { TypographyScaleName, FontSizePresetName, DesignTokens } from '../index.js';

describe('designTokensSchema', () => {
  it('validates DEFAULT_DESIGN_TOKENS', () => {
    const result = designTokensSchema.safeParse(DEFAULT_DESIGN_TOKENS);
    expect(result.success).toBe(true);
  });

  it('rejects missing system color slot', () => {
    const broken = {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        ...DEFAULT_DESIGN_TOKENS.colors,
        system: { ...DEFAULT_DESIGN_TOKENS.colors.system, primary: undefined } as unknown as typeof DEFAULT_DESIGN_TOKENS.colors.system,
      },
    };
    expect(designTokensSchema.safeParse(broken).success).toBe(false);
  });

  it('backfills header defaults when the blob omits it (pre-header token snapshots)', () => {
    // tokensV2 blobs persisted before `header` existed must still parse — the
    // schema default fills logoHeight/navFontSize so the storefront header
    // renders at its previous size instead of undefined.
    const { header: _omit, ...withoutHeader } = DEFAULT_DESIGN_TOKENS;
    void _omit;
    const result = designTokensSchema.safeParse(withoutHeader);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.header).toEqual(DEFAULT_DESIGN_TOKENS.header);
    }
  });
});

describe('header tokens', () => {
  it('emits --brand-logo-height / --brand-nav-font-size from header tokens', () => {
    const tokens = { ...DEFAULT_DESIGN_TOKENS, header: { ...DEFAULT_DESIGN_TOKENS.header, logoHeight: 64, navFontSize: 18, navFontWeight: 700 } };
    const vars = tokensToCssVars(tokens);
    expect(vars['--brand-logo-height']).toBe('64px');
    expect(vars['--brand-nav-font-size']).toBe('18px');
    expect(vars['--brand-nav-font-weight']).toBe('700');
  });

  it('legacyThemeToTokens backfills header for a tokensV2 blob missing it', () => {
    // Simulate a stored snapshot that predates the header field.
    const { header: _omit, ...v2WithoutHeader } = DEFAULT_DESIGN_TOKENS;
    void _omit;
    const tokens = legacyThemeToTokens({ tokensV2: v2WithoutHeader as typeof DEFAULT_DESIGN_TOKENS });
    expect(tokens.header).toEqual(DEFAULT_DESIGN_TOKENS.header);
    // And the css emit still produces the vars (no NaN/undefined).
    const vars = tokensToCssVars(tokens);
    expect(vars['--brand-logo-height']).toBe('40px');
    // header 를 빠뜨면 스키머 기본값(16) 이 백필된다. 저장된 14 는
    // to-css-vars 의 한글 하한에 의해 15px 로 붙는다(아래 클램프 테스트).
    expect(vars['--brand-nav-font-size']).toBe('16px');
  });
});

describe('blockStyleSchema', () => {
  it('accepts an empty object', () => {
    expect(blockStyleSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a typography override using a token color', () => {
    const r = blockStyleSchema.safeParse({
      typography: { color: { token: 'primary' }, weight: 'bold' },
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown keys at the top level', () => {
    const r = blockStyleSchema.safeParse({ typography: {}, garbage: true });
    expect(r.success).toBe(false);
  });
});

describe('FONT_SIZE_PRESETS', () => {
  it('default preset matches DEFAULT_DESIGN_TOKENS h1 desktop', () => {
    expect(FONT_SIZE_PRESETS.default.h1.desktop).toBe(
      DEFAULT_DESIGN_TOKENS.typography.scales.h1!.size.desktop,
    );
  });

  it('all four density presets are monotone-increasing on h1', () => {
    expect(FONT_SIZE_PRESETS.compact.h1.desktop).toBeLessThan(FONT_SIZE_PRESETS.default.h1.desktop);
    expect(FONT_SIZE_PRESETS.default.h1.desktop).toBeLessThan(FONT_SIZE_PRESETS.large.h1.desktop);
    expect(FONT_SIZE_PRESETS.large.h1.desktop).toBeLessThan(FONT_SIZE_PRESETS.xlarge.h1.desktop);
  });

  it('SPACING_PRESETS sectionPaddingY is monotone', () => {
    expect(SPACING_PRESETS.cozy.sectionPaddingY).toBeLessThan(SPACING_PRESETS.default.sectionPaddingY);
    expect(SPACING_PRESETS.default.sectionPaddingY).toBeLessThan(SPACING_PRESETS.airy.sectionPaddingY);
    expect(SPACING_PRESETS.airy.sectionPaddingY).toBeLessThan(SPACING_PRESETS.spacious.sectionPaddingY);
  });
});

describe('tokensToCssVars', () => {
  const vars = tokensToCssVars(DEFAULT_DESIGN_TOKENS);

  it('emits 8 system color slots', () => {
    expect(vars['--brand-primary']).toBe('#2563eb');
    expect(vars['--brand-surface']).toBe('#f1f5f9');
  });

  it('emits typography family + per-scale size in px', () => {
    expect(vars['--brand-font-heading']).toContain('Pretendard');
    expect(vars['--brand-h1']).toBe('72px');
    expect(vars['--brand-body']).toBe('17px');
  });

  it('emits radius and container-max', () => {
    expect(vars['--brand-radius-md']).toBe('8px');
    expect(vars['--brand-container-max']).toBe('1200px');
  });

  it('emits spacing tokens', () => {
    expect(vars['--brand-section-py']).toBe('75px');
    expect(vars['--brand-gap-grid']).toBe('24px');
  });

  it('emits transform / letter-spacing for overline', () => {
    expect(vars['--brand-overline-transform']).toBe('uppercase');
    expect(vars['--brand-overline-letter-spacing']).toBe('0.6px');
  });

  it('passes a custom color through', () => {
    const t = {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        ...DEFAULT_DESIGN_TOKENS.colors,
        custom: { 'brand-yellow': '#ffe600' },
      },
    };
    expect(tokensToCssVars(t)['--brand-brand-yellow']).toBe('#ffe600');
  });
});

describe('tokensToCssText', () => {
  it('wraps in :root by default', () => {
    const css = tokensToCssText(DEFAULT_DESIGN_TOKENS);
    expect(css).toMatch(/^:root \{/);
    expect(css).toContain('--brand-primary: #2563eb;');
  });

  it('accepts a custom scope', () => {
    const css = tokensToCssText(DEFAULT_DESIGN_TOKENS, '.b2b-blocks-preview');
    expect(css).toMatch(/^\.b2b-blocks-preview \{/);
  });

  it('emits mobile media-query block when sizes differ', () => {
    const css = tokensToCssText(DEFAULT_DESIGN_TOKENS);
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('--brand-h1: 42px');
  });
});

describe('contrast helpers', () => {
  it('relativeLuminance ranges 0..1', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 4);
  });

  it('contrastRatio of black-vs-white is 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('pickForeground returns light text on dark bg', () => {
    expect(pickForeground('#1e293b')).toBe('#FFFFFF');
    expect(pickForeground('#ffffff')).toBe('#1A1A1A');
  });

  it('paletteWithFg adds {slot}-fg keys passing WCAG AA on default palette', () => {
    const sys = DEFAULT_DESIGN_TOKENS.colors.system;
    const aug = paletteWithFg(sys);
    expect(aug['primary-fg']).toBeDefined();
    expect(aug['background-fg']).toBeDefined();
    expect(aug['surface-fg']).toBeDefined();
    // Every fg should clear AA against its own bg.
    for (const slot of Object.keys(sys)) {
      const bg = (sys as Record<string, string>)[slot]!;
      const fg = aug[`${slot}-fg`]!;
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('tokensToCssVars emits {slot}-fg variables', () => {
    const v = tokensToCssVars(DEFAULT_DESIGN_TOKENS);
    expect(v['--brand-primary-fg']).toBeDefined();
    expect(v['--brand-accent-fg']).toBeDefined();
    expect(v['--brand-background-fg']).toBeDefined();
  });

  it('palette with a noxious yellow primary still finds AA-passing fg', () => {
    const sys = { ...DEFAULT_DESIGN_TOKENS.colors.system, primary: '#facc15' };
    const aug = paletteWithFg(sys);
    expect(contrastRatio(aug['primary-fg']!, '#facc15')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('applyFontSizePreset', () => {
  it('large preset bumps h1 desktop to 88', () => {
    const t = applyFontSizePreset(DEFAULT_DESIGN_TOKENS, 'large');
    expect(t.typography.scales.h1!.size.desktop).toBe(88);
    expect(t.typography.scales.h1!.size.mobile).toBe(48);
  });

  it('preserves weight / lineHeight from input', () => {
    const t = applyFontSizePreset(DEFAULT_DESIGN_TOKENS, 'compact');
    expect(t.typography.scales.h1!.weight).toBe(DEFAULT_DESIGN_TOKENS.typography.scales.h1!.weight);
    expect(t.typography.scales.h1!.lineHeight).toBeCloseTo(
      DEFAULT_DESIGN_TOKENS.typography.scales.h1!.lineHeight,
    );
  });

  it('does not mutate the input tokens', () => {
    const before = DEFAULT_DESIGN_TOKENS.typography.scales.h1!.size.desktop;
    applyFontSizePreset(DEFAULT_DESIGN_TOKENS, 'xlarge');
    expect(DEFAULT_DESIGN_TOKENS.typography.scales.h1!.size.desktop).toBe(before);
  });
});

describe('applySpacingPreset', () => {
  it('airy preset sets section padding to 100', () => {
    const t = applySpacingPreset(DEFAULT_DESIGN_TOKENS, 'airy');
    expect(t.spacing.sectionPaddingY).toBe(100);
  });
});

describe('detect*Preset', () => {
  it('detects default font preset on DEFAULT_DESIGN_TOKENS', () => {
    expect(detectFontSizePreset(DEFAULT_DESIGN_TOKENS)).toBe('default');
  });

  it('detects default spacing preset on DEFAULT_DESIGN_TOKENS', () => {
    expect(detectSpacingPreset(DEFAULT_DESIGN_TOKENS)).toBe('default');
  });

  it('detects compact after applying compact', () => {
    const t = applyFontSizePreset(DEFAULT_DESIGN_TOKENS, 'compact');
    expect(detectFontSizePreset(t)).toBe('compact');
  });

  it('returns null on custom sizes', () => {
    const t: typeof DEFAULT_DESIGN_TOKENS = {
      ...DEFAULT_DESIGN_TOKENS,
      typography: {
        ...DEFAULT_DESIGN_TOKENS.typography,
        scales: {
          ...DEFAULT_DESIGN_TOKENS.typography.scales,
          h1: { ...DEFAULT_DESIGN_TOKENS.typography.scales.h1!, size: { desktop: 99, mobile: 50 } },
        },
      },
    };
    expect(detectFontSizePreset(t)).toBeNull();
  });
});

describe('legacyThemeToTokens', () => {
  it('returns DEFAULTS for null input', () => {
    const t = legacyThemeToTokens(null);
    expect(t.colors.system.primary).toBe('#2563eb');
    expect(t.containerMax).toBe(1200);
  });

  it('returns deep-equal tokensV2 content', () => {
    const out = legacyThemeToTokens({ tokensV2: DEFAULT_DESIGN_TOKENS });
    expect(out).toEqual(DEFAULT_DESIGN_TOKENS);
    // Cloned, so editor mutations to the result don't ripple into the source.
    expect(out).not.toBe(DEFAULT_DESIGN_TOKENS);
  });

  it('tokensV2 typography wins; legacy typography is ignored when tokensV2 is present', () => {
    // Regression: the legacy `typography` overlay used to clobber tokensV2 on
    // every read, reverting the super-admin editor's saved scale edits to the
    // stale seed value ("변경전 내용이 그대로"). tokensV2 is authoritative — the
    // legacy overlay applies ONLY when tokensV2 is absent.
    const customV2: typeof DEFAULT_DESIGN_TOKENS = {
      ...DEFAULT_DESIGN_TOKENS,
      typography: {
        ...DEFAULT_DESIGN_TOKENS.typography,
        scales: {
          ...DEFAULT_DESIGN_TOKENS.typography.scales,
          h1: { ...DEFAULT_DESIGN_TOKENS.typography.scales.h1!, size: { desktop: 64, mobile: 40 } },
        },
      },
    };
    const out = legacyThemeToTokens({
      tokensV2: customV2,
      typography: { h1: { fontSize: '90px' } },
    });
    // tokensV2 h1 (64) wins — the legacy 90px is ignored.
    expect(out.typography.scales.h1!.size.desktop).toBe(64);
    // Other scales come from tokensV2 untouched.
    expect(out.typography.scales.h2).toEqual(customV2.typography.scales.h2);
  });

  it('legacy typography overlays defaults when there is NO tokensV2', () => {
    const out = legacyThemeToTokens({ typography: { h1: { fontSize: '90px' } } });
    expect(out.typography.scales.h1!.size.desktop).toBe(90);
  });

  it('overlays legacy colors onto defaults', () => {
    const t = legacyThemeToTokens({
      colors: { primary: '#ff5733', accent: '#facc15' },
    });
    expect(t.colors.system.primary).toBe('#ff5733');
    expect(t.colors.system.accent).toBe('#facc15');
    expect(t.colors.system.background).toBe('#ffffff'); // default preserved
  });

  it('parses px font-size on h1', () => {
    const t = legacyThemeToTokens({
      typography: { h1: { fontSize: '88px', fontWeight: 'bold', lineHeight: '1.05' } },
    });
    expect(t.typography.scales.h1!.size.desktop).toBe(88);
    expect(t.typography.scales.h1!.weight).toBe(700);
    expect(t.typography.scales.h1!.lineHeight).toBeCloseTo(1.05);
  });

  it('maps legacy paragraph onto body scale', () => {
    const t = legacyThemeToTokens({
      typography: { paragraph: { fontSize: '17px', lineHeight: '1.7' } },
    });
    expect(t.typography.scales.body!.size.desktop).toBe(17);
    expect(t.typography.scales.body!.lineHeight).toBeCloseTo(1.7);
  });
});

describe('resolveColorToCss / resolveColorToHex', () => {
  it('token wins over hex in CSS resolution', () => {
    expect(resolveColorToCss({ token: 'primary', hex: '#ff0000' })).toBe('var(--brand-primary)');
  });

  it('hex used when token is absent (CSS)', () => {
    expect(resolveColorToCss({ hex: '#ff0000' })).toBe('#ff0000');
  });

  it('hex resolution uses tokens snapshot', () => {
    expect(resolveColorToHex({ token: 'primary' }, DEFAULT_DESIGN_TOKENS)).toBe('#2563eb');
  });

  it('falls back when token is unknown', () => {
    expect(resolveColorToHex({ token: 'unknown-slot' }, DEFAULT_DESIGN_TOKENS, '#000')).toBe('#000');
  });
});

/**
 * 한글 가독 하한 — globals.css / packages/blocks styles.css 의 --fs-* 래더와
 * 같은 기준(본문 16px+, 보조 13px+). 토큰 기본값이 래더보다 작으면 운영자가
 * 테마를 저장하는 순간 사이트 전체가 한 단계 줄어든다(yedam 에서 실제로 발생).
 */
describe('한글 타입 스케일 하한', () => {
  const READING: TypographyScaleName[] = ['body'];
  const SECONDARY: TypographyScaleName[] = ['caption', 'overline', 'label', 'button', 'h6'];

  it('본문은 데스크톱·태블릿·모바일 모두 16px 이상', () => {
    for (const name of READING) {
      const s = DEFAULT_DESIGN_TOKENS.typography.scales[name]!.size;
      for (const v of [s.desktop, s.tablet ?? s.desktop, s.mobile ?? s.desktop]) {
        expect(v).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it('본문 행간은 1.7 이상 (한글은 디센더 여유가 없다)', () => {
    expect(DEFAULT_DESIGN_TOKENS.typography.scales.body!.lineHeight).toBeGreaterThanOrEqual(1.7);
  });

  it('보조 텍스트도 13px 아래로 내려가지 않는다', () => {
    for (const name of SECONDARY) {
      const s = DEFAULT_DESIGN_TOKENS.typography.scales[name]!.size;
      for (const v of [s.desktop, s.tablet ?? s.desktop, s.mobile ?? s.desktop]) {
        expect(v, `${name}`).toBeGreaterThanOrEqual(13);
      }
    }
  });

  it('모든 프리셋이 하한을 지킨다 — compact 도 포함', () => {
    for (const [preset, sizes] of Object.entries(FONT_SIZE_PRESETS)) {
      expect(sizes.body.desktop, `${preset}.body`).toBeGreaterThanOrEqual(16);
      expect(sizes.body.mobile, `${preset}.body mobile`).toBeGreaterThanOrEqual(16);
      expect(sizes.caption.desktop, `${preset}.caption`).toBeGreaterThanOrEqual(13);
      expect(sizes.caption.mobile, `${preset}.caption mobile`).toBeGreaterThanOrEqual(13);
    }
  });

  it('프리셋은 서로 구분 가능하다 (detectFontSizePreset 이 혼동하지 않는다)', () => {
    const names = Object.keys(FONT_SIZE_PRESETS) as FontSizePresetName[];
    for (const name of names) {
      const t = applyFontSizePreset(DEFAULT_DESIGN_TOKENS, name);
      expect(detectFontSizePreset(t)).toBe(name);
    }
  });

  it('큰 제목만 자간을 줄인다 — 작은 스케일에 음수 자간이 없다', () => {
    for (const [name, spec] of Object.entries(DEFAULT_DESIGN_TOKENS.typography.scales)) {
      if (spec.letterSpacing !== undefined && spec.letterSpacing < 0) {
        expect(spec.size.desktop, `${name}`).toBeGreaterThanOrEqual(19);
      }
    }
  });
});

/**
 * 한글 하한을 세우기 전에 저장된 스냅샷(구 compact: 본문 15 / 캡션 12)이 그대로
 * 남아 있어 그 테넌트는 사이트 전체가 작게 렌더됐다 — yedam 에서 실제로 발생.
 * 내보내는 쪽에서 하한을 걸어 데이터 마이그레이션 없이 복구한다.
 */
describe('koreanFloorPx / 하한 클램프', () => {
  it('하한 미달 값을 하한까지 올린다', () => {
    expect(koreanFloorPx('body', 15)).toBe(16);
    expect(koreanFloorPx('caption', 12)).toBe(13);
    expect(koreanFloorPx('overline', 11)).toBe(13);
  });

  it('하한을 넘는 값은 그대로 둔다 (large/xlarge 선택이 유지된다)', () => {
    expect(koreanFloorPx('body', 19)).toBe(19);
    expect(koreanFloorPx('caption', 16)).toBe(16);
  });

  it('큰 제목은 하한을 두지 않는다', () => {
    expect(koreanFloorPx('h1', 40)).toBe(40);
    expect(koreanFloorPx('h2', 24)).toBe(24);
  });

  const legacyCompact = (): DesignTokens => {
    const t = JSON.parse(JSON.stringify(DEFAULT_DESIGN_TOKENS)) as DesignTokens;
    t.typography.scales.body!.size = { desktop: 15, tablet: 15, mobile: 15 };
    t.typography.scales.caption!.size = { desktop: 12, tablet: 12, mobile: 12 };
    t.header!.navFontSize = 14;
    return t;
  };

  it('구 스냅샷의 작은 본문이 CSS 변수에서 올라간다', () => {
    const vars = tokensToCssVars(legacyCompact());
    expect(vars['--brand-body']).toBe('16px');
    expect(vars['--brand-caption']).toBe('13px');
  });

  it('모바일 override 도 하한 아래로 내려가지 않는다', () => {
    const css = tokensToCssText(legacyCompact(), ':root');
    const mobileBody = /--brand-body:\s*(\d+)px/g;
    for (const m of css.matchAll(mobileBody)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(16);
    }
  });

  it('헤더 내비 라벨도 15px 아래로 내려가지 않는다', () => {
    expect(tokensToCssVars(legacyCompact())['--brand-nav-font-size']).toBe('15px');
  });
});

/**
 * 타입 래더 배선 — globals.css 가 `:root` 에서 `var(--brand-*)` 를 파생하던 구조는
 * 동작하지 않는다. 커스텀 속성의 var() 는 선언된 요소에서 치환되고, --brand-* 는
 * `[data-tenant]` 에 주입되므로 :root 에는 없다 → 항상 폴백이 상속됐다(2026-11-02
 * 라이브에서 측정: --brand-body 16px 인데 같은 요소 --fs-base 가 1.0625rem).
 * 그래서 토큰과 같은 스코프로 같이 내보낸다.
 */
describe('타입 래더 테넌트 스코프 배선', () => {
  it('--fs-* 텍스트 래더를 토큰과 같은 맵으로 내보낸다', () => {
    const vars = tokensToCssVars(DEFAULT_DESIGN_TOKENS);
    expect(vars['--fs-lg']).toBe('var(--brand-h5, 1.1875rem)');
    expect(vars['--fs-base']).toBe('var(--brand-body, 1.0625rem)');
    expect(vars['--fs-sm']).toBe('var(--brand-label, 0.9375rem)');
    expect(vars['--fs-xs']).toBe('var(--brand-caption, 0.875rem)');
  });

  it('koText() 가 읽는 --ko-* 도 같은 스코프에서 파생된다', () => {
    const vars = tokensToCssVars(DEFAULT_DESIGN_TOKENS);
    expect(vars['--ko-eyebrow']).toBe('var(--fs-xs)');
    expect(vars['--ko-meta']).toBe('var(--fs-sm)');
    expect(vars['--ko-tab']).toBe('var(--fs-sm)');
    expect(vars['--ko-body']).toBe('var(--fs-base)');
    expect(vars['--ko-summary']).toBe('calc(var(--fs-base) - 1px)');
  });

  it('테넌트 스코프 CSS 안에 래더가 --brand-* 와 같은 규칙으로 들어간다', () => {
    const css = tokensToCssText(DEFAULT_DESIGN_TOKENS, '[data-tenant="acme"]');
    const firstRule = css.slice(0, css.indexOf('}'));
    // 같은 규칙이어야 var() 가 테넌트 값으로 치환된다.
    expect(firstRule).toContain('--brand-body:');
    expect(firstRule).toContain('--fs-base: var(--brand-body');
    expect(firstRule).toContain('--ko-body: var(--fs-base)');
  });

  it('제목 래더(--fs-h1~h4)는 배선하지 않는다 — 모바일 clamp 를 깨뜨린다', () => {
    const vars = tokensToCssVars(DEFAULT_DESIGN_TOKENS);
    for (const k of ['--fs-display', '--fs-h1', '--fs-h2', '--fs-h3', '--fs-h4']) {
      expect(vars[k]).toBeUndefined();
    }
  });

  it('래더는 미디어 블록에 중복되지 않는다 — --brand-* 재선언을 따라가므로', () => {
    const t = JSON.parse(JSON.stringify(DEFAULT_DESIGN_TOKENS)) as DesignTokens;
    t.typography.scales.body!.size = { desktop: 19, tablet: 18, mobile: 17 };
    const css = tokensToCssText(t, '[data-tenant="acme"]');
    const media = css.slice(css.indexOf('@media'));
    expect(media).toContain('--brand-body:');
    expect(media).not.toContain('--fs-base');
    expect(media).not.toContain('--ko-body');
  });

  it('하한 클램프가 래더까지 전달된다 — 구 compact 스냅샷', () => {
    const t = JSON.parse(JSON.stringify(DEFAULT_DESIGN_TOKENS)) as DesignTokens;
    t.typography.scales.body!.size = { desktop: 15, tablet: 15, mobile: 15 };
    t.typography.scales.caption!.size = { desktop: 12, tablet: 12, mobile: 12 };
    const vars = tokensToCssVars(t);
    // 래더는 --brand-* 를 가리키고, 그 --brand-* 가 이미 하한까지 올라가 있다.
    expect(vars['--brand-body']).toBe('16px');
    expect(vars['--brand-caption']).toBe('13px');
    expect(vars['--fs-base']).toContain('--brand-body');
    expect(vars['--fs-xs']).toContain('--brand-caption');
  });
});
