/**
 * Settings service — regression for the camelCase save bug.
 *
 * The api-client sends camelCase bodies (snakeize-on-send was removed). The
 * settings store whitelists snake_case keys, so upsertSettings must convert
 * incoming keys first — otherwise EVERY field (incl. images) is silently
 * dropped and "기본정보 저장이 안돼".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/database.js', () => ({
  prisma: { $queryRawUnsafe: vi.fn() },
}));

const { prisma } = await import('../../config/database.js');
const { upsertSettings } = await import('../../modules/settings/service.js');

beforeEach(() => {
  vi.mocked(prisma.$queryRawUnsafe).mockReset();
  // getAllSettings (final SELECT) returns empty; writes resolve to undefined.
  vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([] as never);
});

function writeCalls() {
  // INSERT/DELETE calls carry the key as the first bound param after the SQL.
  return vi.mocked(prisma.$queryRawUnsafe).mock.calls
    .filter((c) => typeof c[0] === 'string' && /INSERT|DELETE/.test(c[0] as string))
    .map((c) => ({ sql: c[0] as string, key: c[1] as string, value: c[2] as string | undefined }));
}

describe('upsertSettings — camelCase → snake_case', () => {
  it('persists camelCase fields (incl. images) under snake_case keys', async () => {
    await upsertSettings('tenant_demo', {
      churchName: 'True Light',
      churchAddress: '240 Tusculum Road',
      logoUrl: 'https://r2/logo.png',
      socialKakaotalkChannel: 'https://pf.kakao.com/x',
      ogImageUrl: 'https://r2/og.png',
    });
    const inserts = writeCalls().filter((c) => /INSERT/.test(c.sql));
    const keys = inserts.map((c) => c.key);
    expect(keys).toContain('church_name');
    expect(keys).toContain('church_address');
    expect(keys).toContain('logo_url');
    expect(keys).toContain('social_kakaotalk_channel');
    expect(keys).toContain('og_image_url');
    // image URL value persisted, not dropped
    expect(inserts.find((c) => c.key === 'logo_url')?.value).toBe('https://r2/logo.png');
  });

  it('still accepts already-snake_case keys (idempotent)', async () => {
    await upsertSettings('tenant_demo', { church_phone: '615-781-4949' });
    expect(writeCalls().some((c) => c.key === 'church_phone')).toBe(true);
  });

  it('drops unknown keys', async () => {
    await upsertSettings('tenant_demo', { bogusField: 'x' } as Record<string, string>);
    expect(writeCalls().some((c) => /bogus/i.test(c.key))).toBe(false);
  });

  it('deletes a key when the value is emptied', async () => {
    await upsertSettings('tenant_demo', { churchName: '' });
    const del = writeCalls().find((c) => /DELETE/.test(c.sql));
    expect(del?.key).toBe('church_name');
  });
});
