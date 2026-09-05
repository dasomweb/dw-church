/**
 * 교적 스키마 검증 — 특히 목록 perPage 상한(교인 선택 드롭다운이 perPage=500 으로
 * 전체 교인을 불러오다 max(200) 에 막혀 400 → 빈 드롭다운이 됐던 회귀 방지).
 */
import { describe, it, expect } from 'vitest';
import { listMembersQuerySchema, createMemberSchema, recordAttendanceSchema, createTransferSchema } from '../../modules/membership/schema.js';

describe('listMembersQuerySchema.perPage', () => {
  it('accepts the dropdown page size (500) and the max (2000)', () => {
    expect(listMembersQuerySchema.parse({ perPage: 500 }).perPage).toBe(500);
    expect(listMembersQuerySchema.parse({ perPage: 2000 }).perPage).toBe(2000);
  });
  it('coerces a string and rejects over-max', () => {
    expect(listMembersQuerySchema.parse({ perPage: '500' }).perPage).toBe(500);
    expect(() => listMembersQuerySchema.parse({ perPage: 2001 })).toThrow();
  });
  it('defaults regStatus omitted (route defaults to active)', () => {
    expect(listMembersQuerySchema.parse({}).regStatus).toBeUndefined();
    expect(listMembersQuerySchema.parse({ regStatus: 'all' }).regStatus).toBe('all');
  });
});

describe('createMemberSchema', () => {
  it('requires a name', () => {
    expect(() => createMemberSchema.parse({})).toThrow();
    expect(createMemberSchema.parse({ name: '김성도' }).name).toBe('김성도');
  });
  it('rejects a malformed birthDate', () => {
    expect(() => createMemberSchema.parse({ name: 'x', birthDate: '3/2/1980' })).toThrow();
    expect(createMemberSchema.parse({ name: 'x', birthDate: '1980-03-02' }).birthDate).toBe('1980-03-02');
  });
});

describe('recordAttendanceSchema', () => {
  it('accepts present/absent/online only', () => {
    const ok = recordAttendanceSchema.parse({ serviceId: '11111111-1111-1111-1111-111111111111', date: '2026-09-06', entries: [{ memberId: '22222222-2222-2222-2222-222222222222', status: 'online' }] });
    expect(ok.entries[0]!.status).toBe('online');
    expect(() => recordAttendanceSchema.parse({ serviceId: '11111111-1111-1111-1111-111111111111', date: '2026-09-06', entries: [{ memberId: '22222222-2222-2222-2222-222222222222', status: 'maybe' }] })).toThrow();
  });
});

describe('createTransferSchema', () => {
  it('restricts trType to the four movement kinds', () => {
    expect(createTransferSchema.parse({ memberId: '22222222-2222-2222-2222-222222222222', trType: 'out' }).trType).toBe('out');
    expect(() => createTransferSchema.parse({ memberId: '22222222-2222-2222-2222-222222222222', trType: 'teleport' })).toThrow();
  });
});
