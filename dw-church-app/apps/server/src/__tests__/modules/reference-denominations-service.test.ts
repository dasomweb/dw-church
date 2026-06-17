/**
 * 이단 필터 classify() tests — severity precedence, bidirectional substring,
 * empty/no-match handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryRawUnsafe = vi.fn();
vi.mock('../../config/database.js', () => ({
  prisma: { $queryRawUnsafe: (...a: unknown[]) => queryRawUnsafe(...a) },
}));

const { classifyDenomination } = await import('../../modules/reference-denominations/service.js');

const REF = [
  { name: '예장합동', status: 'recognized' },
  { name: 'Presbyterian', status: 'recognized' },
  { name: '신천지', status: 'cult' },
  { name: 'Jehovah\'s Witnesses', status: 'cult' },
];

beforeEach(() => {
  queryRawUnsafe.mockReset();
  queryRawUnsafe.mockResolvedValue(REF);
});

describe('classifyDenomination', () => {
  it('matches a recognized denomination', async () => {
    const r = await classifyDenomination('예장합동');
    expect(r?.status).toBe('recognized');
  });

  it('flags a cult by substring (church name contains the cult name)', async () => {
    const r = await classifyDenomination('서울 신천지 교회');
    expect(r?.status).toBe('cult');
    expect(r?.matchedName).toBe('신천지');
  });

  it('matches case-insensitively across English', async () => {
    const r = await classifyDenomination('First presbyterian Church');
    expect(r?.status).toBe('recognized');
  });

  it('cult severity wins when both could match', async () => {
    queryRawUnsafe.mockResolvedValue([
      { name: '장로교', status: 'recognized' },
      { name: '장로교 신천지', status: 'cult' },
    ]);
    const r = await classifyDenomination('장로교 신천지');
    expect(r?.status).toBe('cult');
  });

  it('returns null for no match', async () => {
    const r = await classifyDenomination('Random Community Org');
    expect(r).toBeNull();
  });

  it('returns null for empty input', async () => {
    expect(await classifyDenomination('')).toBeNull();
    expect(await classifyDenomination(null)).toBeNull();
  });

  it('handles an empty/undefined reference table gracefully', async () => {
    queryRawUnsafe.mockResolvedValue(undefined);
    expect(await classifyDenomination('예장합동')).toBeNull();
  });
});
