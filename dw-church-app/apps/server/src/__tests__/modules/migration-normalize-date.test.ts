import { describe, it, expect } from 'vitest';
import { normalizeDate, migrationKey } from '../../modules/migration/appliers/normalize-date.js';

describe('normalizeDate', () => {
  it('passes through ISO dates', () => {
    expect(normalizeDate('2024-03-15')).toBe('2024-03-15');
    expect(normalizeDate('2024-3-5')).toBe('2024-03-05');
  });

  it('takes the date part of an ISO datetime', () => {
    expect(normalizeDate('2024-03-15T09:00:00Z')).toBe('2024-03-15');
    expect(normalizeDate('2024-03-15 09:00')).toBe('2024-03-15');
  });

  it('handles dot-separated dates', () => {
    expect(normalizeDate('2024.03.15')).toBe('2024-03-15');
    expect(normalizeDate('2024. 3. 5.')).toBe('2024-03-05');
  });

  it('handles slash-separated dates', () => {
    expect(normalizeDate('2024/03/15')).toBe('2024-03-15');
    expect(normalizeDate('2024/3/5')).toBe('2024-03-05');
  });

  it('handles Korean dates', () => {
    expect(normalizeDate('2024년 3월 15일')).toBe('2024-03-15');
    expect(normalizeDate('2024년 03월 05일')).toBe('2024-03-05');
  });

  it('handles compact 8-digit dates', () => {
    expect(normalizeDate('20240315')).toBe('2024-03-15');
  });

  it('falls back to first-of-month for year+month only', () => {
    expect(normalizeDate('2024년 3월')).toBe('2024-03-01');
    expect(normalizeDate('2024-03')).toBe('2024-03-01');
  });

  it('returns null for non-date / relative text', () => {
    expect(normalizeDate('매주 주일 오후 2시')).toBeNull();
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate('coming soon')).toBeNull();
  });

  it('rejects impossible calendar values', () => {
    expect(normalizeDate('2024-13-01')).toBeNull(); // month 13
    expect(normalizeDate('2024-03-45')).toBeNull(); // day 45
    expect(normalizeDate('1700-03-15')).toBeNull(); // year out of range
  });
});

describe('migrationKey', () => {
  it('prefers the real source URL', () => {
    expect(migrationKey('sermon', 'https://x.org/p/1', '주일예배', '2024-03-15'))
      .toBe('https://x.org/p/1');
  });

  it('synthesizes a stable key from title + date when no URL', () => {
    expect(migrationKey('sermon', '', '주일 예배', '2024.03.15'))
      .toBe('mig:sermon:주일 예배:2024-03-15');
    // Same item → same key (idempotent re-import).
    expect(migrationKey('sermon', undefined, '주일 예배', '2024-03-15'))
      .toBe('mig:sermon:주일 예배:2024-03-15');
  });

  it('returns null when no URL and no parseable date (avoids clobbering)', () => {
    // Two distinct same-title items with no date must NOT collide.
    expect(migrationKey('sermon', '', '주일예배', '')).toBeNull();
    expect(migrationKey('sermon', '', '', '2024-03-15')).toBeNull();
  });
});
