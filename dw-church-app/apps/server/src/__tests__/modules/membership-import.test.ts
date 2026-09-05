/**
 * 교적 엑셀(CSV) 가져오기 파서 — 유닛 테스트 (순수 함수, DB 불필요).
 * 헤더 자동 인식, 성별/등록상태/날짜 정규화, 무효 행 처리.
 */
import { describe, it, expect } from 'vitest';
import { parseMemberCsv, normalizeDate } from '../../modules/membership/import-service.js';

describe('normalizeDate', () => {
  it('accepts YYYY-MM-DD / . / / and YYYYMMDD', () => {
    expect(normalizeDate('1980-03-02')).toBe('1980-03-02');
    expect(normalizeDate('1980.3.2')).toBe('1980-03-02');
    expect(normalizeDate('1980/03/02')).toBe('1980-03-02');
    expect(normalizeDate('19800302')).toBe('1980-03-02');
  });
  it('rejects garbage / impossible dates', () => {
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate('March 2, 1980')).toBeNull();
    expect(normalizeDate('1980-13-40')).toBeNull();
  });
});

describe('parseMemberCsv — header auto-detect (Korean)', () => {
  it('maps 한글 헤더 + normalizes gender/status/date', () => {
    const csv = [
      '이름,성별,생년월일,전화,직분,등록상태,구역',
      '김철수,남,1978-09-05,(201) 555-0101,집사,정착,1구역',
      '박영희,여,1981.02.14,(201) 555-0102,권사,새가족,1구역',
    ].join('\n');
    const { rows, invalid } = parseMemberCsv(csv);
    expect(invalid).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: '김철수', gender: 'M', birthDate: '1978-09-05', position: '집사', regStatus: 'active', region: '1구역' });
    expect(rows[1]).toMatchObject({ name: '박영희', gender: 'F', birthDate: '1981-02-14', regStatus: 'newcomer' });
  });

  it('maps English headers too', () => {
    const csv = 'name,gender,birthDate,email\nJohn Kim,male,1990-01-01,john@x.com';
    const { rows } = parseMemberCsv(csv);
    expect(rows[0]).toMatchObject({ name: 'John Kim', gender: 'M', birthDate: '1990-01-01', email: 'john@x.com' });
  });

  it('drops an invalid email but keeps the row', () => {
    const csv = '이름,이메일\n김철수,not-an-email';
    const { rows } = parseMemberCsv(csv);
    expect(rows[0]!.name).toBe('김철수');
    expect(rows[0]!.email).toBeUndefined();
  });

  it('counts rows with no name as invalid', () => {
    const csv = '이름,전화\n,010-0000\n김철수,(201) 555-0101';
    const { rows, invalid } = parseMemberCsv(csv);
    expect(rows).toHaveLength(1);
    expect(invalid).toBe(1);
  });
});

describe('parseMemberCsv — no header (positional)', () => {
  it('reads col0=name col1=phone col2=birth col3=position', () => {
    const csv = '김철수,(201) 555-0101,1978-09-05,집사';
    const { rows } = parseMemberCsv(csv);
    expect(rows[0]).toMatchObject({ name: '김철수', phone: '(201) 555-0101', birthDate: '1978-09-05', position: '집사' });
  });
});

describe('parseMemberCsv — quoted commas', () => {
  it('respects quotes so an address with a comma stays one field', () => {
    const csv = '이름,주소\n김철수,"123 Main St, Fort Lee, NJ"';
    const { rows } = parseMemberCsv(csv);
    expect(rows[0]!.address).toBe('123 Main St, Fort Lee, NJ');
  });
});
