/** Unit tests — catalog generator (registry → catalog + markdown). */
import { describe, it, expect } from 'vitest';
import { buildCatalog, renderCatalogMd, type Registry } from '../gen-catalog.js';

const REG: Registry = {
  version: 1,
  groups: { hero: '히어로', data: '데이터 블록' },
  blocks: {
    hero_banner: { label: '히어로 배너', group: 'hero', flags: {}, defaultProps: { variant: 'x', height: 'md' }, aiHint: 'Page hero.' },
    hero_full_width: { label: '풀폭', group: 'hero', flags: { isAlias: true }, aliasOf: 'hero_banner', description: 'alias.' },
    recent_sermons: { label: '최근 설교', group: 'data', flags: {}, defaultProps: { limit: 6 }, aiHint: 'Sermons grid.' },
    editorial_rows: { label: '에디토리얼', group: 'data', flags: { isHidden: true }, defaultProps: {}, aiHint: 'Hidden importer block.' },
  },
};

describe('buildCatalog', () => {
  const cat = buildCatalog(REG);

  it('classifies surface: palette / importer(hidden) / alias', () => {
    const by = Object.fromEntries(cat.blocks.map((b) => [b.block_type, b.surface]));
    expect(by.hero_banner).toBe('palette');
    expect(by.recent_sermons).toBe('palette');
    expect(by.editorial_rows).toBe('importer');
    expect(by.hero_full_width).toBe('alias');
  });

  it('counts add up', () => {
    expect(cat.counts).toEqual({ total: 4, palette: 2, importer: 1, alias: 1 });
  });

  it('extracts key props from defaultProps', () => {
    const hero = cat.blocks.find((b) => b.block_type === 'hero_banner')!;
    expect(hero.keyProps).toEqual(['variant', 'height']);
  });

  it('exposes the 10 token slots + 11 typo scales + church modules', () => {
    expect(cat.tokens.systemSlots).toHaveLength(10);
    expect(cat.tokens.typographyScales).toHaveLength(11);
    expect(cat.tokens.systemSlots.map((s) => s.role)).toContain('onDark');
    expect(cat.modules.some((m) => m.name === 'sermons')).toBe(true);
  });
});

describe('renderCatalogMd', () => {
  const md = renderCatalogMd(buildCatalog(REG));

  it('is markdown with the church-tone rule + a block table row', () => {
    expect(md).toContain('# True Light / DW Church — Capabilities Catalog');
    expect(md).toContain('검정/다크 배경 밴드 금지');
    expect(md).toContain('`hero_banner`');
    expect(md).toContain('`recent_sermons`');
    expect(md).toContain('NEEDS_BLOCK');
  });

  it('renders a section per group', () => {
    expect(md).toContain('### 히어로 (`hero`)');
    expect(md).toContain('### 데이터 블록 (`data`)');
  });
});
