import { describe, it, expect } from 'vitest';
import {
  createNewcomerSchema,
  createNewcomerHistorySchema,
  NEWCOMER_HISTORY_TYPES,
} from '../../modules/newcomers/schema.js';

describe('createNewcomerSchema (스태프 직접 등록 = 공개 폼과 동일)', () => {
  it('accepts a name-only submission', () => {
    expect(createNewcomerSchema.safeParse({ name: '김성실' }).success).toBe(true);
  });

  it('accepts a full paper-card entry', () => {
    expect(createNewcomerSchema.safeParse({
      name: '이믿음',
      phone: '(201) 555-0100',
      email: 'faith@example.com',
      address: '1172 Satellite Blvd NW, Suwanee, GA',
      birthDate: '1990-03-15',
      gender: '여',
      prevChurch: '이전 교회',
      visitPath: '지인 소개',
      faithStatus: '초신자',
      familyInfo: '남편, 자녀 2명',
      prayerRequest: '가정의 평안',
    }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(createNewcomerSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('createNewcomerHistorySchema (정착 히스토리)', () => {
  it('accepts a minimal entry and defaults type to contact', () => {
    const parsed = createNewcomerHistorySchema.safeParse({ entryDate: '2026-09-07', content: '첫 통화' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.type).toBe('contact');
  });

  it('accepts every valid history type', () => {
    for (const type of NEWCOMER_HISTORY_TYPES) {
      expect(createNewcomerHistorySchema.safeParse({ entryDate: '2026-09-07', type, content: '기록' }).success).toBe(true);
    }
  });

  it('rejects an unknown type', () => {
    expect(createNewcomerHistorySchema.safeParse({ entryDate: '2026-09-07', type: 'bogus', content: '기록' }).success).toBe(false);
  });

  it('rejects empty content', () => {
    expect(createNewcomerHistorySchema.safeParse({ entryDate: '2026-09-07', content: '' }).success).toBe(false);
  });

  it('rejects missing entryDate', () => {
    expect(createNewcomerHistorySchema.safeParse({ content: '기록' }).success).toBe(false);
  });
});
