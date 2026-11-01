import { describe, it, expect } from 'vitest';
import { bulletinVisibility } from '../publish-window';

/**
 * 온라인 주보 공개 상태.
 *
 * 핵심 규칙: **예배일에는 무조건 공개된다**(대표님 지시). 예약일은 그 전까지만
 * 가려 두는 장치이지, 공개를 막는 장치가 아니다. 서버 조회 조건
 * (modules/online-bulletins/service.ts 의 VISIBLE)과 같은 판정이어야 한다.
 */
const TODAY = '2026-11-08';

describe('bulletinVisibility', () => {
  it('예약일이 없으면 공개중', () => {
    const v = bulletinVisibility({ status: 'published', publishAt: '', serviceDate: '2026-11-08' }, TODAY);
    expect(v.visible).toBe(true);
    expect(v.label).toBe('공개중');
  });

  it('예약일이 아직 안 됐으면 가려진다', () => {
    const v = bulletinVisibility({ status: 'published', publishAt: '2026-11-15', serviceDate: '2026-11-15' }, TODAY);
    expect(v.visible).toBe(false);
    expect(v.label).toBe('2026-11-15부터');
  });

  it('예배일이 오면 공개된다 — 예약일이 그대로여도', () => {
    const v = bulletinVisibility({ status: 'published', publishAt: '2026-11-08', serviceDate: '2026-11-08' }, TODAY);
    expect(v.visible).toBe(true);
  });

  it('예약일을 예배일보다 뒤로 잘못 적어도 예배일엔 공개된다 (보장 조항)', () => {
    // 운영자가 실수로 다음 달을 적어 둔 경우. 그래도 주일에는 성도가 볼 수 있어야 한다.
    const v = bulletinVisibility({ status: 'published', publishAt: '2026-12-01', serviceDate: '2026-11-08' }, TODAY);
    expect(v.visible).toBe(true);
    expect(v.label).toBe('공개중');
  });

  it('지난 주보는 계속 공개 상태로 남는다', () => {
    const v = bulletinVisibility({ status: 'published', publishAt: '2026-11-01', serviceDate: '2026-11-01' }, TODAY);
    expect(v.visible).toBe(true);
  });

  it('임시저장이면 날짜와 무관하게 숨김 — 착각하지 않도록 문구로 알린다', () => {
    const v = bulletinVisibility({ status: 'draft', publishAt: '', serviceDate: '2026-11-08' }, TODAY);
    expect(v.visible).toBe(false);
    expect(v.label).toBe('숨김');
    expect(v.note).toContain('보이지 않습니다');
  });

  it('예약 안내 문구에 예배일 보장을 같이 적는다', () => {
    const v = bulletinVisibility({ status: 'published', publishAt: '2026-11-15', serviceDate: '2026-11-15' }, TODAY);
    expect(v.note).toContain('2026-11-15 부터 공개');
    expect(v.note).toContain('무조건 공개');
  });
});
