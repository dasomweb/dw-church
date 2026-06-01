/**
 * element-styles.ts unit + integration coverage.
 *
 * Covers two recent additions:
 *   - Phase-D fields (textShadow / boxShadow / mixBlendMode / transform
 *     / background) propagate through getElementStyle()
 *   - Phase-C buildElementHoverCss emits scoped CSS for :hover-suffixed
 *     elementStyles entries, with palette keys resolved to var(...)
 *
 * Also exercises BLOCK_MAP consistency — every block_type the
 * agents-adapter pattern map emits, every Phase-5/5b new block, and
 * every block referenced by the admin element-registry must be in
 * BLOCK_MAP. Otherwise pages render with the yellow "Unknown block
 * type" warning instead of real content.
 */
import { describe, it, expect } from 'vitest';
import {
  getElementStyle,
  mergeElementStyle,
  buildElementHoverCss,
  BLOCK_MAP,
  type ElementStyle,
} from '../index';

// ═══════════════════════════════════════════════════════════
// 1. Phase-D fields — textShadow / boxShadow / blend / transform / background
// ═══════════════════════════════════════════════════════════

describe('getElementStyle — Phase-D effects fields', () => {
  it('passes through every new field when supplied', () => {
    const style: ElementStyle = {
      textShadow: '2px 2px 6px rgba(0,0,0,0.4)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      mixBlendMode: 'multiply',
      transform: 'rotate(-2deg)',
      background: 'rgba(255,255,0,0.3)',
    };
    const out = getElementStyle(
      { elementStyles: { title: style } },
      'title',
    );
    expect(out.textShadow).toBe('2px 2px 6px rgba(0,0,0,0.4)');
    expect(out.boxShadow).toBe('0 4px 12px rgba(0,0,0,0.15)');
    expect((out as Record<string, unknown>).mixBlendMode).toBe('multiply');
    expect(out.transform).toBe('rotate(-2deg)');
    expect(out.background).toBe('rgba(255,255,0,0.3)');
  });

  it('omits empty Phase-D fields (no spurious CSS noise)', () => {
    const out = getElementStyle(
      { elementStyles: { title: { color: 'primary' } } },
      'title',
    );
    expect(out.textShadow).toBeUndefined();
    expect(out.boxShadow).toBeUndefined();
    expect(out.transform).toBeUndefined();
    expect(out.background).toBeUndefined();
  });

  it('mergeElementStyle layers Phase-D overrides on top of base style', () => {
    const merged = mergeElementStyle(
      { fontSize: '24px', color: 'black' },
      {
        elementStyles: {
          title: { transform: 'scale(1.05)', opacity: '0.9' },
        },
      },
      'title',
    );
    expect(merged.fontSize).toBe('24px');     // base preserved
    expect(merged.color).toBe('black');        // base preserved
    expect(merged.transform).toBe('scale(1.05)');
    expect(merged.opacity).toBe('0.9');
  });

  // The inspector's element-level "가로 위치" toggle writes
  // marginInline values like 'auto' (center), 'auto 0' (right), or
  // '0 auto' (start). Storefront must propagate them so a centered
  // 480px image actually centers on render.
  it('propagates marginInline for element-level horizontal positioning', () => {
    const center = getElementStyle(
      { elementStyles: { 'items[0].imageUrl': { maxWidth: '480px', marginInline: 'auto' } } },
      'items[0].imageUrl',
    );
    expect(center.maxWidth).toBe('480px');
    expect(center.marginInline).toBe('auto');

    const right = getElementStyle(
      { elementStyles: { logo: { marginInline: 'auto 0' } } },
      'logo',
    );
    expect(right.marginInline).toBe('auto 0');

    // Empty string is dropped — operator clears the override.
    const cleared = getElementStyle(
      { elementStyles: { title: { marginInline: '   ' } } },
      'title',
    );
    expect(cleared.marginInline).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 2. buildElementHoverCss — Phase-C contract
// ═══════════════════════════════════════════════════════════

describe('buildElementHoverCss — Phase-C contract', () => {
  it('emits scoped CSS rules for :hover-suffixed entries', () => {
    const css = buildElementHoverCss('section-uuid-1', {
      elementStyles: {
        title: { color: '#000000' },
        'title:hover': { color: '#ff0000' },
        buttonText: { fontWeight: '700' },
        'buttonText:hover': { opacity: '0.85', transform: 'translateY(-2px)' },
      },
    });
    expect(css).toContain('[data-section-id="section-uuid-1"]');
    expect(css).toContain('[data-element="title"]:hover');
    expect(css).toContain('color: #ff0000');
    expect(css).toContain('[data-element="buttonText"]:hover');
    expect(css).toContain('opacity: 0.85');
    expect(css).toContain('transform: translateY(-2px)');
    // Base entries (no :hover suffix) MUST NOT leak into hover CSS —
    // those go through inline style merging instead.
    expect(css).not.toContain('color: #000000');
    expect(css).not.toContain('font-weight: 700');
  });

  it('returns empty string when no :hover entries exist', () => {
    const css = buildElementHoverCss('s1', {
      elementStyles: { title: { color: 'red' } },
    });
    expect(css).toBe('');
  });

  it('returns empty string when elementStyles is missing', () => {
    expect(buildElementHoverCss('s1', undefined)).toBe('');
    expect(buildElementHoverCss('s1', {})).toBe('');
  });

  it('resolves palette keys → var() in hover output', () => {
    const css = buildElementHoverCss('s1', {
      elementStyles: { 'title:hover': { color: 'primary' } },
    });
    expect(css).toMatch(/color:\s*var\(/);
  });

  it('emits multiple rules separated by newlines', () => {
    const css = buildElementHoverCss('s1', {
      elementStyles: {
        'title:hover': { color: 'red' },
        'subtitle:hover': { color: 'blue' },
      },
    });
    const ruleCount = css.split('\n').filter((line) => line.includes('}')).length;
    expect(ruleCount).toBe(2);
  });

  it('handles textShadow / boxShadow / mixBlendMode in hover state', () => {
    const css = buildElementHoverCss('s1', {
      elementStyles: {
        'title:hover': {
          textShadow: '0 0 8px rgba(255,255,255,0.5)',
          mixBlendMode: 'screen',
          transform: 'translateY(-3px) scale(1.02)',
        },
      },
    });
    expect(css).toContain('text-shadow: 0 0 8px rgba(255,255,255,0.5)');
    expect(css).toContain('mix-blend-mode: screen');
    expect(css).toContain('transform: translateY(-3px) scale(1.02)');
  });

  it('skips :hover entries with empty/whitespace-only values', () => {
    const css = buildElementHoverCss('s1', {
      elementStyles: {
        'title:hover': { color: '   ', fontSize: '' },
      },
    });
    // Both fields whitespace/empty → no CSS to emit, no rule output
    expect(css).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════
// 3. BLOCK_MAP consistency — every emitted block_type renders
// ═══════════════════════════════════════════════════════════

describe('BLOCK_MAP — every block_type the agents emit has a renderer', () => {
  // Pulled by hand from packages/agents-adapter/src/b2bsmart_adapter/
  // patterns/map.py PATTERN_BLOCK_MAP (Python — can't import from JS).
  // Update this list when the adapter pattern map gains new emit types.
  const ADAPTER_EMITTED = [
    'hero_banner',
    'features_grid',
    'cta_section',         // Phase 5
    'testimonials',
    'image_gallery',
    'pricing_table',
    'text_image',
    'stats_counter',
    'team_members',
    'faq_accordion',
    'contact_info',        // storefront-only (data block)
    'logo_bar',
    'video',
    'subscribe_form',
    'location_map',
    'check_list',
  ];

  // Block types implemented as storefront-only data blocks in
  // apps/web/components/blocks. They're intentionally NOT in the
  // shared BLOCK_MAP because they fetch tenant data via @/lib/api,
  // which is a Next.js server-component dependency the shared package
  // can't take. Admin canvas treats them as opaque and renders the
  // "Unknown block type" placeholder until publish — acceptable.
  const STOREFRONT_ONLY = new Set([
    'contact_info',
    'address_info',
    'recent_blog_posts',
    'album_gallery',
    'banner_slider',
    'hero_image_slider',
    'board',
    'products_showcase',
    'recent_products',
  ]);

  it('every adapter-emitted shared block_type is in BLOCK_MAP', () => {
    const rendererTypes = new Set(Object.keys(BLOCK_MAP));
    const missing = ADAPTER_EMITTED.filter(
      (t) => !rendererTypes.has(t) && !STOREFRONT_ONLY.has(t),
    );
    expect(missing).toEqual([]);
  });

  it('every Phase-5 / 5b block_type is in BLOCK_MAP', () => {
    const rendererTypes = new Set(Object.keys(BLOCK_MAP));
    // Newly-added blocks from Phase 5 + 5b. Each must render without
    // falling through to the "Unknown block type" yellow warning.
    const newBlocks = [
      'cta_section',
      'spacer',
      'timeline',
      'contact_form',
      'comparison_table',
      'before_after',
      'hotspot_image',
    ];
    const missing = newBlocks.filter((t) => !rendererTypes.has(t));
    expect(missing).toEqual([]);
  });

  it('legacy call_to_action still renders (back-compat with cta_section)', () => {
    expect(BLOCK_MAP.call_to_action).toBeDefined();
  });
});
