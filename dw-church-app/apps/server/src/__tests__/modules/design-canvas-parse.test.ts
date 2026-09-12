/**
 * Claude Design canvas parser — screen-based (real canvases mark screens with
 * data-screen-label and use sc-for/dc-import; data-page-slug/data-block are
 * optional). Covers slug inference, kind classification, dynamic lists, images.
 */
import { describe, it, expect } from 'vitest';
import { parseCanvas, inferSlug, splitScreensRaw } from '../../modules/design-import/canvas-parse.js';

// Mirrors a real Claude Design export: screen labels, sc-for, dc-import, hotlinked img.
const CANVAS = `
<dc-import name="EmmausHeader"></dc-import>
<div data-screen-label="01 메인">
  <img src="https://mdemmauschurch.org/data/file/main_banner/hero.jpg" alt="">
  <div style="font-weight:800">예수님이 동행하시는 교회</div>
  <sc-for list="{{ sermons }}"><article></article></sc-for>
  <sc-for list="{{ news }}"></sc-for>
</div>
<div data-screen-label="04 예배안내 오시는길">
  <div style="font-weight:800">예배 시간</div>
  <sc-for list="{{ worship }}"></sc-for>
</div>
<div data-screen-label="06 설교 상세"><div>상세</div></div>
<div data-screen-label="20 모바일"><div>mobile</div></div>
<dc-import name="EmmausFooter"></dc-import>
`;

describe('inferSlug', () => {
  it('maps Korean labels to canonical slugs + kind', () => {
    expect(inferSlug('01 메인')).toEqual({ slug: 'home', kind: 'page' });
    expect(inferSlug('04 예배안내 오시는길')).toEqual({ slug: 'worship', kind: 'page' });
    expect(inferSlug('03 섬기는 사람들')).toEqual({ slug: 'staff', kind: 'page' });
    expect(inferSlug('06 설교 상세').kind).toBe('detail');
    expect(inferSlug('20 모바일').kind).toBe('mobile');
  });
});

describe('parseCanvas (screen-based)', () => {
  const parsed = parseCanvas(CANVAS);

  it('extracts screens with inferred slug + kind in order', () => {
    expect(parsed.screens.map((s) => s.slug)).toEqual(['home', 'worship', 'sermon-detail', '']);
    expect(parsed.screens.map((s) => s.kind)).toEqual(['page', 'page', 'detail', 'mobile']);
  });

  it('captures sc-for dynamic list names per screen', () => {
    expect(parsed.screens[0]!.dynamicLists).toEqual(['sermons', 'news']);
    expect(parsed.screens[1]!.dynamicLists).toEqual(['worship']);
  });

  it('collects hotlinked image URLs', () => {
    expect(parsed.imageUrls).toContain('https://mdemmauschurch.org/data/file/main_banner/hero.jpg');
  });

  it('reports dc-import header/footer', () => {
    expect(parsed.imports).toContain('EmmausHeader');
    expect(parsed.imports).toContain('EmmausFooter');
  });

  it('extracts heading text samples', () => {
    expect(parsed.screens[0]!.headings).toContain('예수님이 동행하시는 교회');
  });
});

describe('splitScreensRaw', () => {
  it('slices each screen to its own HTML chunk', () => {
    const chunks = splitScreensRaw(CANVAS);
    expect(chunks).toHaveLength(4);
    expect(chunks[0]!.label).toBe('01 메인');
    expect(chunks[0]!.html).toContain('sc-for list="{{ sermons }}"');
    expect(chunks[0]!.html).not.toContain('예배 시간'); // that's screen 2
  });
});
