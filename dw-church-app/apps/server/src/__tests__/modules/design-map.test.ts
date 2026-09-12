/**
 * Claude Design map — type-scale extraction (design sizes → tokens) and the
 * hardcoded-block replacement (Group-B → token-driven), the two fixes for
 * "design token typography completely ignored".
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({ env: { ANTHROPIC_API_KEY: '', SUPER_ADMIN_EMAILS: [], JWT_SECRET: 'x'.repeat(32) } }));

const { extractTypeScale, styleguideFromTokensCss, BLOCK_REPLACE } = await import('../../modules/design-import/map.js');

describe('extractTypeScale', () => {
  // A canvas with a realistic spread of inline sizes (hero 56 … caption 13).
  const html = `
    <div style="font-size:56px;font-weight:800">예수님이 동행하시는 교회</div>
    <div style="font-size:28px;font-weight:800">이번 주 설교</div>
    <div style="font-size:24px;font-weight:800">교회소식</div>
    <div style="font-size:20px;font-weight:800">카드 제목</div>
    <div style="font-size:16px">본문 텍스트가 여기에 들어갑니다</div>
    <div style="font-size:16px">본문 텍스트 두 번째 문단</div>
    <div style="font-size:13px">2026.09.06 · 2부 주일설교</div>`;
  const scale = extractTypeScale(html);

  it('maps the largest canvas size to h1 (not the 72px default)', () => {
    expect(scale.h1?.size).toBe(56);
    expect(scale.h1?.weight).toBe(800);
  });
  it('produces a strictly descending, stepped scale', () => {
    const seq = [scale.h1!.size, scale.h2!.size, scale.h3!.size, scale.h4!.size, scale.body!.size, scale.caption!.size];
    for (let i = 1; i < seq.length; i++) expect(seq[i]!).toBeLessThan(seq[i - 1]!);
  });
  it('picks a real body size (14–18), not the caption 13', () => {
    expect(scale.body?.size).toBe(16);
  });
  it('returns empty for a canvas with no inline font sizes', () => {
    expect(extractTypeScale('<div>no sizes</div>')).toEqual({});
  });
});

describe('BLOCK_REPLACE (hardcoded → token-driven)', () => {
  it('maps every Group-B block to a token-driven equivalent', () => {
    expect(BLOCK_REPLACE.sermon_feature).toBe('text_image');
    expect(BLOCK_REPLACE.schedule_board).toBe('worship_schedule');
    expect(BLOCK_REPLACE.info_columns).toBe('features_grid');
    expect(BLOCK_REPLACE.logo_bar).toBe('features_grid');
  });
});

describe('styleguideFromTokensCss', () => {
  it('maps dasomweb token vars to the 10 system slots', () => {
    const css = ':root{ --primary:#2b7fff; --brand:#1466d6; --fg:#16181d; --bg:#ffffff; --surface:#f7f8fa; --border:#e5e7eb; --font-sans:"Pretendard Variable",sans-serif; }';
    const sg = styleguideFromTokensCss(css);
    expect(sg.colors.primary).toBe('#2b7fff');
    expect(sg.colors.text).toBe('#16181d');
    expect(sg.colors.background).toBe('#ffffff');
    expect(sg.fonts?.heading).toBe('Pretendard Variable');
  });
});
