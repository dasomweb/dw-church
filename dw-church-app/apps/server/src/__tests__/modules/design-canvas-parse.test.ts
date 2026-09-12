/**
 * Claude Design canvas parser — structure extraction from the PREP-PROMPT
 * contract (data-page-slug / data-block / sc-for / dc-import).
 */
import { describe, it, expect } from 'vitest';
import { parseCanvas } from '../../modules/design-import/canvas-parse.js';

const CANVAS = `
<dc-import name="EmmausHeader"></dc-import>
<section data-screen-label="01 홈" data-page-slug="home">
  <div data-block="hero_banner"><h1>엠마오교회</h1></div>
  <div data-block="worship_schedule"></div>
  <div data-block="recent_sermons">
    <sc-for list="{{ sermons }}"><article></article></sc-for>
  </div>
  <div data-block="call_to_action"></div>
</section>
<section data-screen-label="02 교회소개" data-page-slug="about">
  <div data-block="text_image"><h2>인사말</h2></div>
  <div data-block="NEEDS_BLOCK: 연혁 타임라인 가로형"></div>
  <div data-block="call_to_action"></div>
</section>
<dc-import name="EmmausFooter"></dc-import>
`;

describe('parseCanvas', () => {
  const parsed = parseCanvas(CANVAS);

  it('extracts pages by data-page-slug in document order', () => {
    expect(parsed.pages.map((p) => p.slug)).toEqual(['home', 'about']);
    expect(parsed.pages[0]!.label).toBe('01 홈');
  });

  it('assigns each data-block section to its page', () => {
    expect(parsed.pages[0]!.sections.map((s) => s.blockType)).toEqual([
      'hero_banner', 'worship_schedule', 'recent_sermons', 'call_to_action',
    ]);
  });

  it('captures sc-for dynamic list names per page', () => {
    expect(parsed.pages[0]!.dynamicLists).toEqual(['sermons']);
  });

  it('flags NEEDS_BLOCK sections with their note', () => {
    const about = parsed.pages[1]!;
    const needs = about.sections.find((s) => s.needsBlock)!;
    expect(needs.blockType).toBe('NEEDS_BLOCK');
    expect(needs.note).toBe('연혁 타임라인 가로형');
  });

  it('reports dc-import header/footer without importing them as pages', () => {
    expect(parsed.imports).toEqual(['EmmausHeader', 'EmmausFooter']);
  });

  it('does not warn about CTA when every page ends with call_to_action', () => {
    expect(parsed.warnings.some((w) => w.includes('CTA'))).toBe(false);
  });

  it('warns when a page lacks data-block sections', () => {
    const p = parseCanvas('<section data-page-slug="empty"></section>');
    expect(p.warnings.some((w) => w.includes('empty'))).toBe(true);
  });
});
