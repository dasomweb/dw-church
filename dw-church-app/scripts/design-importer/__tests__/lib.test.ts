/** Unit tests — pure importer core (lib.ts): theme build, page compose, validation. */
import { describe, it, expect } from 'vitest';
import {
  buildChurchTheme, composePage, validateImportSpec, isNearBlack, darkBandWarnings,
  CTA_BLOCKS, type ImportSpec, type Styleguide,
} from '../lib.js';

const SG: Styleguide = {
  name: 'test',
  colors: { primary: '#1e5a8a', secondary: '#2c3e50', background: '#ffffff', surface: '#f7f4ee' },
  fonts: { heading: 'Pretendard', body: 'Pretendard', korean: 'Pretendard' },
};

describe('buildChurchTheme', () => {
  it('overrides the palette slots from the styleguide', () => {
    const t = buildChurchTheme(SG);
    expect(t.colors.system.primary).toBe('#1e5a8a');
    expect(t.colors.system.secondary).toBe('#2c3e50');
    expect(t.colors.system.background).toBe('#ffffff');
  });

  it('keeps a full, valid token shape (fonts + all 11 scales from defaults)', () => {
    const t = buildChurchTheme(SG);
    expect(t.typography.families.heading).toBe('Pretendard');
    const scales = Object.keys(t.typography.scales);
    for (const s of ['h1', 'h2', 'h3', 'body', 'button', 'overline']) expect(scales).toContain(s);
    expect(t.radius).toHaveProperty('md');
  });

  it('does not mutate the shared defaults (deep clone)', () => {
    const a = buildChurchTheme(SG);
    a.colors.system.primary = '#000000';
    const b = buildChurchTheme({ name: 'x', colors: {} });
    expect(b.colors.system.primary).not.toBe('#000000');
  });

  it('merges custom tokens', () => {
    const t = buildChurchTheme({ ...SG, custom: { badgeGold: '#c08a2d' } });
    expect(t.colors.custom.badgeGold).toBe('#c08a2d');
  });
});

describe('composePage', () => {
  it('maps sections to ordered API payloads and publishes', () => {
    const c = composePage({
      name: '홈', slug: 'home',
      sections: [{ blockType: 'hero_banner', props: { title: 'x' } }, { blockType: 'call_to_action' }],
    });
    expect(c.page).toEqual({ title: '홈', slug: 'home', status: 'published', sortOrder: 0 });
    expect(c.sections).toEqual([
      { blockType: 'hero_banner', props: { title: 'x' }, sortOrder: 0 },
      { blockType: 'call_to_action', props: {}, sortOrder: 1 },
    ]);
  });
});

describe('validateImportSpec', () => {
  const base = (sections: { blockType: string }[]): ImportSpec => ({
    styleguide: SG, pages: [{ name: 'P', slug: 'p', sections }],
  });

  it('warns when a page does not end with a CTA', () => {
    const w = validateImportSpec(base([{ blockType: 'hero_banner' }]));
    expect(w.some((x) => x.includes('CTA'))).toBe(true);
  });

  it('no CTA warning when the last section is a CTA', () => {
    const w = validateImportSpec(base([{ blockType: 'hero_banner' }, { blockType: 'call_to_action' }]));
    expect(w.some((x) => x.includes('CTA'))).toBe(false);
  });

  it('CTA_BLOCKS accepts both cta_section and call_to_action', () => {
    expect(CTA_BLOCKS.has('cta_section')).toBe(true);
    expect(CTA_BLOCKS.has('call_to_action')).toBe(true);
  });
});

describe('church tone — dark band guard', () => {
  it('isNearBlack: black yes, white/slate no', () => {
    expect(isNearBlack('#000000')).toBe(true);
    expect(isNearBlack('#111111')).toBe(true);
    expect(isNearBlack('#ffffff')).toBe(false);
    expect(isNearBlack('#2c3e50')).toBe(false); // slate — allowed
  });

  it('warns when a band slot is near-black', () => {
    const w = darkBandWarnings({ name: 'x', colors: { background: '#0a0a0a' } });
    expect(w.some((x) => x.includes('background'))).toBe(true);
  });

  it('no warning for a warm light palette', () => {
    expect(darkBandWarnings(SG)).toEqual([]);
  });
});
