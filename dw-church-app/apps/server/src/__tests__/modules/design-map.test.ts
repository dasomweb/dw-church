/**
 * Claude Design map — 타입 스케일 추출(시안 px → 토큰)과 **블록 이름 정규화**.
 *
 * 이전에는 하드코딩 타이포를 이유로 블록을 다른 블록으로 강제 치환하는 `BLOCK_REPLACE`
 * 가 있었다. 2026-11-09 재감사에서 제거했다 — 시안 구조를 버리고, `schedule_board`
 * (Data Block) 의 데이터 출처까지 없앴기 때문이다. 지금은 구조를 유지하고 타이포 결함만
 * 경고로 올린다(`TYPOGRAPHY_WARN`). 이 테스트는 그 변경을 고정한다.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({ env: { ANTHROPIC_API_KEY: '', SUPER_ADMIN_EMAILS: [], JWT_SECRET: 'x'.repeat(32) } }));

const { extractTypeScale, styleguideFromTokensCss } = await import('../../modules/design-import/map.js');
const mapModule = await import('../../modules/design-import/map.js');
const { BLOCK_ALIASES, TYPOGRAPHY_WARN } = await import('../../modules/design-import/catalog.js');

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

describe('블록 이름 정규화 — 구조는 바꾸지 않는다', () => {
  it('강제 치환 표(BLOCK_REPLACE)는 더 이상 존재하지 않는다', () => {
    // 되살아나면 임포트가 다시 시안 구조를 버리고 schedule_board 를 빈 블록으로 만든다.
    expect(mapModule).not.toHaveProperty('BLOCK_REPLACE');
  });

  it('운영자가 놓을 수 없는 이름만 놓을 수 있는 이름으로 바꾼다', () => {
    // 정식 이름 cta_section 은 팔레트에 없고 별칭 call_to_action 만 있다.
    expect(BLOCK_ALIASES.cta_section).toBe('call_to_action');
    expect(BLOCK_ALIASES.subscribe_form).toBe('newsletter_signup');
  });

  it('구조가 다른 블록으로는 정규화하지 않는다', () => {
    // schedule_board(Data) → worship_schedule(Static) 같은 치환이 끼어들면 안 된다.
    for (const [from, to] of Object.entries(BLOCK_ALIASES)) {
      expect(from, `${from} → ${to} 는 별칭이 아니라 구조 치환입니다`).not.toBe('schedule_board');
      expect(from).not.toBe('week_schedule');
      expect(from).not.toBe('bento_grid');
    }
  });

  it('타이포 결함은 치환이 아니라 측정값으로 남는다', () => {
    // 생성기가 컴포넌트 소스를 세어 넣는다 — 고치면 자동으로 빠진다.
    expect(Object.keys(TYPOGRAPHY_WARN).length).toBeGreaterThan(0);
    expect(TYPOGRAPHY_WARN.schedule_board, 'schedule_board 는 고정 px 가 0 이다').toBeUndefined();
    expect(TYPOGRAPHY_WARN.sermon_feature).toBeGreaterThan(0);
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
