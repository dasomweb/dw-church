import { describe, it, expect } from 'vitest';
import { createHistorySchema, updateHistorySchema } from '../../modules/history/schema.js';

describe('createHistorySchema', () => {
  const valid = { year: 2010, items: [{ content: '교회 설립' }] };

  it('accepts valid input', () => {
    expect(createHistorySchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full items', () => {
    expect(createHistorySchema.safeParse({
      year: 2020,
      items: [
        { content: '온라인 예배 시작', month: 3, day: 15 },
        { content: '유튜브 채널 개설', month: 5, photo_url: 'https://example.com/img.jpg' },
      ],
    }).success).toBe(true);
  });

  it('rejects year below 1900', () => {
    expect(createHistorySchema.safeParse({ year: 1899, items: [] }).success).toBe(false);
  });

  it('rejects year above 2100', () => {
    expect(createHistorySchema.safeParse({ year: 2101, items: [] }).success).toBe(false);
  });

  it('rejects item without content', () => {
    expect(createHistorySchema.safeParse({ year: 2020, items: [{ month: 3 }] }).success).toBe(false);
  });

  it('rejects empty content string', () => {
    expect(createHistorySchema.safeParse({ year: 2020, items: [{ content: '' }] }).success).toBe(false);
  });

  it('rejects month outside 1-12', () => {
    expect(createHistorySchema.safeParse({ year: 2020, items: [{ content: 'test', month: 13 }] }).success).toBe(false);
  });

  it('rejects day outside 1-31', () => {
    expect(createHistorySchema.safeParse({ year: 2020, items: [{ content: 'test', day: 32 }] }).success).toBe(false);
  });

  it('defaults items to empty array', () => {
    const r = createHistorySchema.safeParse({ year: 2020 });
    if (r.success) expect(r.data.items).toEqual([]);
  });
});

describe('updateHistorySchema', () => {
  it('accepts partial (year only)', () => {
    expect(updateHistorySchema.safeParse({ year: 2021 }).success).toBe(true);
  });
  it('accepts partial (items only)', () => {
    expect(updateHistorySchema.safeParse({ items: [{ content: 'test' }] }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateHistorySchema.safeParse({}).success).toBe(true);
  });
});
