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
  it('merges tokensV2 into existing settings (UPDATE path)', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([
      { id: 'r1', settings: { colors: { primary: '#000' }, customCss: '/* keep */' } },
    ] as never);

    const tokens = { ...DEFAULT_DESIGN_TOKENS };
    await updateThemeTokens('tenant_grace', tokens);

    const call = vi.mocked(prisma.$executeRawUnsafe).mock.calls[0];
    expect(call?.[0]).toMatch(/UPDATE/i);
    const payload = JSON.parse(call?.[1] as string);
    expect(payload.tokensV2.colors.system.primary).toBe(tokens.colors.system.primary);
    // The legacy editor data must not be erased.
    expect(payload.colors.primary).toBe('#000');
    expect(payload.customCss).toBe('/* keep */');
  });

  it('creates a new theme row when none exists (INSERT path)', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([] as never);

    await updateThemeTokens('tenant_grace', DEFAULT_DESIGN_TOKENS);

    const call = vi.mocked(prisma.$executeRawUnsafe).mock.calls[0];
    expect(call?.[0]).toMatch(/INSERT/i);
    const payload = JSON.parse(call?.[1] as string);
    expect(payload.tokensV2).toBeTruthy();
  });
});
