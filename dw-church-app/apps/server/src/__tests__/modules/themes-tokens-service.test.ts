/**
 * Theme tokens service-layer tests.
 *
 * Pins the contract: getThemeTokens reads `themes.settings` JSONB and
 * projects through legacyThemeToTokens, while updateThemeTokens writes
 * the snapshot under `settings.tokensV2` without disturbing the legacy
 * colors/fonts/customCss the old editor still emits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_DESIGN_TOKENS } from '@dw-church/design-tokens';

vi.mock('../../config/database.js', () => ({
  prisma: { $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));

const { getThemeTokens, updateThemeTokens } = await import('../../modules/themes/service.js');
const { prisma } = await import('../../config/database.js');

beforeEach(() => {
  vi.mocked(prisma.$queryRawUnsafe).mockReset();
  vi.mocked(prisma.$executeRawUnsafe).mockReset();
});

describe('getThemeTokens', () => {
  it('returns DEFAULT_DESIGN_TOKENS when no theme row exists', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([] as never);
    const tokens = await getThemeTokens('tenant_grace');
    expect(tokens.colors.system.primary).toBe(DEFAULT_DESIGN_TOKENS.colors.system.primary);
  });

  it('projects legacy settings into the tokens shape', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([
      {
        id: 'r1',
        name: 'modern',
        is_active: true,
        settings: { colors: { primary: '#abc123' }, fonts: { heading: 'Cardo, serif' } },
        created_at: new Date(),
        updated_at: new Date(),
      },
    ] as never);
    const tokens = await getThemeTokens('tenant_grace');
    expect(tokens.colors.system.primary).toBe('#abc123');
    expect(tokens.typography.families.heading).toBe('Cardo, serif');
  });

  it('prefers tokensV2 over the legacy projection when present', async () => {
    const customTokens = JSON.parse(JSON.stringify(DEFAULT_DESIGN_TOKENS));
    customTokens.colors.system.primary = '#deadbe';
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([
      {
        id: 'r1',
        name: 'modern',
        is_active: true,
        settings: { colors: { primary: '#000000' }, tokensV2: customTokens },
        created_at: new Date(),
        updated_at: new Date(),
      },
    ] as never);
    const tokens = await getThemeTokens('tenant_grace');
    expect(tokens.colors.system.primary).toBe('#deadbe');
  });
});

describe('updateThemeTokens', () => {
  it('writes tokensV2 into ALL active rows via jsonb_set (UPDATE path)', async () => {
    // jsonb_set injects tokensV2 in-place (legacy colors/customCss preserved in
    // SQL), and WHERE is_active=true covers duplicate-active rows — the fix for
    // the "saved design ignored" bug. $executeRawUnsafe returns the rowcount.
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValueOnce(2 as never);

    const tokens = JSON.parse(JSON.stringify(DEFAULT_DESIGN_TOKENS));
    tokens.colors.system.primary = '#123456';
    await updateThemeTokens('tenant_grace', tokens);

    const call = vi.mocked(prisma.$executeRawUnsafe).mock.calls[0];
    expect(call?.[0]).toMatch(/UPDATE/i);
    expect(call?.[0]).toMatch(/jsonb_set/i);
    expect(call?.[0]).toMatch(/is_active\s*=\s*true/i);
    const payload = JSON.parse(call?.[1] as string); // $1 is the tokens snapshot
    expect(payload.colors.system.primary).toBe('#123456');
    expect(vi.mocked(prisma.$executeRawUnsafe).mock.calls.length).toBe(1); // no INSERT
  });

  it('creates a row when no active theme exists (INSERT path)', async () => {
    vi.mocked(prisma.$executeRawUnsafe)
      .mockResolvedValueOnce(0 as never) // UPDATE affected 0 rows
      .mockResolvedValueOnce(1 as never); // INSERT

    await updateThemeTokens('tenant_grace', DEFAULT_DESIGN_TOKENS);

    const insertCall = vi.mocked(prisma.$executeRawUnsafe).mock.calls[1];
    expect(insertCall?.[0]).toMatch(/INSERT/i);
    const payload = JSON.parse(insertCall?.[1] as string);
    expect(payload.colors.system).toBeTruthy(); // $1 is the tokens snapshot
  });
});
