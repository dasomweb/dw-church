import { describe, it, expect } from 'vitest';
import {
  KOREAN_TYPE,
  KOREAN_BODY_FLOOR_PX,
  KOREAN_TEXT_FLOOR_PX,
  KOREAN_TIGHT_TRACKING_MIN_PX,
  koText,
  koreanTypeViolations,
  type KoreanTextRole,
  type KoreanTextSpec,
} from '../utilities/korean-type';

/**
 * 라틴 시안의 11~14px 를 그대로 옮겨 한글이 뭉개지던 문제를 막는다.
 * yedam v5 홈에서 실제로 발생 — 카테고리 라벨 11px, 메타 12px, 발췌 13px.
 */
describe('KOREAN_TYPE', () => {
  const roles = Object.keys(KOREAN_TYPE) as KoreanTextRole[];

  it('모든 역할이 한글 조판 규칙을 지킨다', () => {
    const all = roles.flatMap((r) => koreanTypeViolations(r, KOREAN_TYPE[r]));
    expect(all).toEqual([]);
  });

  it('보조 텍스트도 13px 아래로 내려가지 않는다', () => {
    for (const r of roles) {
      expect(KOREAN_TYPE[r].minPx).toBeGreaterThanOrEqual(KOREAN_TEXT_FLOOR_PX);
    }
  });

  it('읽는 텍스트는 16px 이상 · 행간 1.7 이상', () => {
    for (const r of ['summary', 'body', 'lede'] as const) {
      expect(KOREAN_TYPE[r].minPx).toBeGreaterThanOrEqual(KOREAN_BODY_FLOOR_PX);
      expect(KOREAN_TYPE[r].lineHeight).toBeGreaterThanOrEqual(1.7);
    }
  });

  it('음수 자간은 큰 제목에만 — 작은 역할은 0 또는 양수', () => {
    for (const r of roles) {
      const { letterSpacing, minPx } = KOREAN_TYPE[r];
      if (letterSpacing && parseFloat(letterSpacing) < 0) {
        expect(minPx).toBeGreaterThanOrEqual(KOREAN_TIGHT_TRACKING_MIN_PX);
      }
    }
  });

  it('라벨 자간은 라틴처럼 과하게 벌리지 않는다 (음절이 흩어진다)', () => {
    expect(parseFloat(KOREAN_TYPE.eyebrow.letterSpacing!)).toBeLessThanOrEqual(0.06);
    expect(parseFloat(KOREAN_TYPE.eyebrow.letterSpacing!)).toBeGreaterThan(0);
  });

  it('크기 위계가 뒤집히지 않는다', () => {
    const { eyebrow, meta, summary, body, lede, cardTitle, railTitle, sectionTitle } = KOREAN_TYPE;
    expect(eyebrow.minPx).toBeLessThanOrEqual(meta.minPx);
    expect(meta.minPx).toBeLessThan(summary.minPx);
    expect(summary.minPx).toBeLessThan(body.minPx);
    expect(body.minPx).toBeLessThan(lede.minPx);
    expect(lede.minPx).toBeLessThanOrEqual(cardTitle.minPx);
    expect(cardTitle.minPx).toBeLessThan(railTitle.minPx);
    expect(railTitle.minPx).toBeLessThan(sectionTitle.minPx);
  });

  it('모든 역할이 --ko-* 변수를 거친다 (테마 프리셋이 반영되도록)', () => {
    for (const r of roles) {
      expect(KOREAN_TYPE[r].fontSize).toMatch(/^var\(--ko-[a-z-]+, .+\)$/);
    }
  });
});

describe('koreanTypeViolations', () => {
  const base: KoreanTextSpec = { fontSize: 'var(--ko-meta, 15px)', minPx: 15, lineHeight: 1.6 };

  it('하한 미달을 잡는다', () => {
    const v = koreanTypeViolations('meta', { ...base, fontSize: 'var(--ko-meta, 11px)', minPx: 11 });
    expect(v.join(' ')).toContain('한글 하한');
  });

  it('읽는 텍스트의 좁은 행간을 잡는다', () => {
    const v = koreanTypeViolations('body', { ...base, fontSize: 'var(--ko-body, 17px)', minPx: 17, lineHeight: 1.5 });
    expect(v.join(' ')).toContain('1.7 이상');
  });

  it('작은 글씨의 음수 자간을 잡는다', () => {
    const v = koreanTypeViolations('meta', { ...base, letterSpacing: '-0.02em' });
    expect(v.join(' ')).toContain('자간 축소는');
  });

  it('큰 제목이라도 과한 자간 축소를 잡는다', () => {
    const v = koreanTypeViolations('sectionTitle', {
      fontSize: 'var(--ko-section-title, 26px)', minPx: 26, lineHeight: 1.3, letterSpacing: '-0.06em',
    });
    expect(v.join(' ')).toContain('까지만');
  });

  it('변수를 거치지 않는 크기를 잡는다', () => {
    const v = koreanTypeViolations('meta', { ...base, fontSize: '15px' });
    expect(v.join(' ')).toContain('--ko-* 변수');
  });

  it('정상 스펙은 빈 배열', () => {
    expect(koreanTypeViolations('meta', base)).toEqual([]);
  });
});

describe('koText', () => {
  it('인라인 스타일로 펼칠 수 있는 객체를 돌려준다', () => {
    expect(koText('summary')).toEqual({ fontSize: 'var(--ko-summary, 16px)', lineHeight: 1.75 });
  });

  it('자간·굵기가 있는 역할은 같이 실어 준다', () => {
    expect(koText('eyebrow')).toEqual({
      fontSize: 'var(--ko-eyebrow, 14px)', lineHeight: 1.5, letterSpacing: '0.04em', fontWeight: 600,
    });
  });

  it('뒤에 오는 override 가 이긴다', () => {
    expect(koText('eyebrow', { fontWeight: 700, color: '#000' })).toMatchObject({ fontWeight: 700, color: '#000' });
  });
});
