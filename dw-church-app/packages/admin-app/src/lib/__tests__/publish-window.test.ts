import { describe, it, expect } from 'vitest';
import { publishPhase, publishBadge, publishRangeText, churchToday, CHURCH_TZ } from '../publish-window';

/**
 * 게시 기간(예약 공개) 상태 판정.
 *
 * 이 뱃지가 서버 필터와 어긋나면 운영자는 "공개중인데 사이트엔 없다"를 보게 된다.
 * 그래서 기준일은 브라우저 로컬이 아니라 **교회 현지 날짜(미 동부)** 다 —
 * 서버 IN_WINDOW 와 같은 시간대.
 */
describe('publishPhase', () => {
  const TODAY = '2026-11-08';

  it('날짜를 안 넣으면 항상 공개중', () => {
    expect(publishPhase('', '', TODAY)).toBe('active');
    expect(publishPhase(null, null, TODAY)).toBe('active');
    expect(publishPhase(undefined, undefined, TODAY)).toBe('active');
  });

  it('시작일이 미래면 공개 예정', () => {
    expect(publishPhase('2026-11-09', '', TODAY)).toBe('scheduled');
  });

  it('시작일이 바로 오늘이면 공개중 (그 날 아침부터 보인다)', () => {
    expect(publishPhase(TODAY, '', TODAY)).toBe('active');
  });

  it('종료일이 바로 오늘이면 아직 공개중 (그 날까지 보인다)', () => {
    expect(publishPhase('', TODAY, TODAY)).toBe('active');
  });

  it('종료일이 지나면 종료', () => {
    expect(publishPhase('2026-10-01', '2026-11-07', TODAY)).toBe('ended');
  });

  it('시작 전이면 종료일이 지났더라도 공개 예정이 먼저다 (거꾸로 입력한 경우)', () => {
    expect(publishPhase('2026-12-01', '2026-11-01', TODAY)).toBe('scheduled');
  });

  it('ISO 타임스탬프로 와도 날짜만 보고 판정한다', () => {
    expect(publishPhase('2026-11-09T00:00:00.000Z', '', TODAY)).toBe('scheduled');
    expect(publishPhase('2026-11-08T00:00:00.000Z', '', TODAY)).toBe('active');
  });
});

describe('publishBadge', () => {
  it('상태별 라벨', () => {
    expect(publishBadge('2026-12-01', '', '2026-11-08').label).toBe('공개 예정');
    expect(publishBadge('', '', '2026-11-08').label).toBe('공개중');
    expect(publishBadge('', '2026-11-01', '2026-11-08').label).toBe('종료');
  });
});

describe('publishRangeText', () => {
  it('비우면 제한 없음', () => {
    expect(publishRangeText('', '')).toBe('제한 없음');
  });
  it('한쪽만 있으면 반대쪽은 줄표', () => {
    expect(publishRangeText('2026-11-08', '')).toBe('2026-11-08 ~ —');
    expect(publishRangeText('', '2026-11-30')).toBe('— ~ 2026-11-30');
  });
  it('타임스탬프는 날짜까지만', () => {
    expect(publishRangeText('2026-11-08T12:00:00Z', '2026-11-30T12:00:00Z')).toBe('2026-11-08 ~ 2026-11-30');
  });
});

describe('churchToday', () => {
  it('YYYY-MM-DD 형식', () => {
    expect(churchToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('UTC 가 아니라 교회 현지(미 동부) 날짜를 쓴다', () => {
    // UTC 11/09 01:00 = 미 동부 11/08 20:00 → 교회 기준으로는 아직 8일이다.
    // 이게 깨지면 주일자 칼럼이 토요일 밤에 떠 버린다.
    expect(churchToday(new Date('2026-11-09T01:00:00Z'))).toBe('2026-11-08');
    expect(CHURCH_TZ).toBe('America/New_York');
  });
});
