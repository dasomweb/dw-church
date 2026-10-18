import { describe, it, expect } from 'vitest';
import type { OnlineBulletinContent } from '@dw-church/api-client';
import { addOneWeek, retitleForDate, carryOverContent } from '../OnlineBulletinManagement';

/**
 * 지난 주보 복제 — 날짜 계산과 제목 치환은 조용히 틀리기 쉬운 자리라 고정해둔다.
 * 특히 "복제했는데 지난주 설교가 그대로 남아 있더라" 가 제일 위험한 실패라
 * 비워야 할 항목이 실제로 비는지를 못 박는다.
 */
describe('addOneWeek', () => {
  it('7일을 더한다', () => {
    expect(addOneWeek('2026-10-11')).toBe('2026-10-18');
  });
  it('월을 넘긴다', () => {
    expect(addOneWeek('2026-10-25')).toBe('2026-11-01');
  });
  it('연을 넘긴다', () => {
    expect(addOneWeek('2026-12-27')).toBe('2027-01-03');
  });
  it('윤년 2월을 넘긴다', () => {
    expect(addOneWeek('2028-02-26')).toBe('2028-03-04');
  });
  it('형식이 아니면 빈 문자열', () => {
    expect(addOneWeek('')).toBe('');
    expect(addOneWeek('2026/10/11')).toBe('');
  });
});

describe('retitleForDate', () => {
  it('제목 안의 날짜만 바꾸고 교회가 쓰던 형식은 유지한다', () => {
    expect(retitleForDate('2026년 10월 11일 주일예배', '2026-10-11', '2026-10-18', '주일예배'))
      .toBe('2026년 10월 18일 주일예배');
    expect(retitleForDate('2026년 12월 25일 성탄주일예배', '2026-12-25', '2027-01-01', '주일예배'))
      .toBe('2027년 1월 1일 성탄주일예배');
  });
  it('제목에 날짜가 없으면 새로 만든다', () => {
    expect(retitleForDate('이번 주 주보', '2026-10-11', '2026-10-18', '주일예배'))
      .toBe('2026년 10월 18일 주일예배');
  });
  it('예배 종류가 비면 주일예배로 떨어진다', () => {
    expect(retitleForDate('', '2026-10-11', '2026-10-18', '')).toBe('2026년 10월 18일 주일예배');
  });
});

describe('carryOverContent', () => {
  const src: OnlineBulletinContent = {
    serviceTitle: '주일 2부 예배',
    presider: '김목사',
    worshipOrder: [{ label: '묵도', detail: '다같이', person: '인도자' }],
    prayerRequests: [{ title: '선교지', detail: '무사히' }],
    announcements: [{ title: '수련회', body: '11월 1일' }],
    // ↓ 그 주일에만 해당하는 내용 — 복제 시 반드시 비어야 한다
    hymns: [{ title: '주 은혜임을', imageUrls: ['https://r2/x.png'] }] as OnlineBulletinContent['hymns'],
    representativePrayer: { person: '이집사', content: '지난주 기도문' },
    scripture: { reference: '요 5:1-9', text: '지난주 본문' },
    sermonNote: { title: '지난주 설교', text: '지난주 설교 본문' },
    childrenSermonNote: { title: '지난주 어린이 설교', text: '…' },
    childrenCartoon: { imageUrls: ['https://r2/cartoon.png'] },
    closingHymn: { title: '마지막 찬양' } as NonNullable<OnlineBulletinContent['closingHymn']>,
    study: { observation: ['관찰1'], correlation: ['상관1'], application: ['적용1'] },
  };

  const out = carryOverContent(src);

  it('반복되는 틀은 가져온다', () => {
    expect(out.serviceTitle).toBe('주일 2부 예배');
    expect(out.presider).toBe('김목사');
    expect(out.worshipOrder).toEqual(src.worshipOrder);
    expect(out.prayerRequests).toEqual(src.prayerRequests);
    expect(out.announcements).toEqual(src.announcements);
  });

  it('그 주일에만 해당하는 내용은 전부 비운다', () => {
    expect(out.hymns).toEqual([]);
    expect(out.representativePrayer).toEqual({ person: '', content: '' });
    expect(out.scripture?.reference).toBe('');
    expect(out.scripture?.text).toBe('');
    expect(out.sermonNote).toBeUndefined();
    expect(out.childrenSermonNote).toBeUndefined();
    expect(out.childrenCartoon).toBeUndefined();
    expect(out.closingHymn?.title ?? '').toBe('');
    expect(out.study).toEqual({
      observation: [], correlation: [], application: [],
      observationEn: [], correlationEn: [], applicationEn: [],
    });
  });

  it('원본과 참조를 공유하지 않는다 (복제본 수정이 원본을 건드리면 안 됨)', () => {
    out.worshipOrder!.push({ label: '추가', detail: '', person: '' });
    expect(src.worshipOrder).toHaveLength(1);
  });
});
