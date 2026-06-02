import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  legacyThemeToTokens,
  type DesignTokens,
  type LegacyThemeBlob,
} from '@dw-church/design-tokens';
import type { UpdateThemeInput } from './schema.js';

interface ThemeRow {
  id: string;
  name: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface ThemeResponse {
  id: string;
  templateName: string;
  colors: Record<string, unknown>;
  fonts: Record<string, unknown>;
  customCss: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project the row into the legacy colors/fonts shape, but compute the
 * effective values through `legacyThemeToTokens()` first. This is the
 * single-source-of-truth contract: regardless of which editor (super-
 * admin's tokens UI or the legacy form) wrote last, callers of GET
 * /theme see the SAME effective values that GET /theme/tokens emits.
 * Without this projection, a tenant whose super-admin set primary=red
 * in tokensV2 would still see the stale primary=blue in any UI that
 * reads the legacy shape.
 */
function mapThemeRow(row: ThemeRow): ThemeResponse {
  const settings = (row.settings ?? {}) as LegacyThemeBlob & Record<string, unknown>;
  const tokens = legacyThemeToTokens(settings);
  return {
    id: row.id,
    templateName: (settings.templateName as string | undefined) ?? row.name ?? 'modern',
    colors: {
      primary: tokens.colors.system.primary,
      secondary: tokens.colors.system.secondary,
      accent: tokens.colors.system.accent,
      background: tokens.colors.system.background,
      surface: tokens.colors.system.surface,
      text: tokens.colors.system.text,
      muted: tokens.colors.system.muted,
      border: tokens.colors.system.border,
    },
    fonts: {
      heading: tokens.typography.families.heading,
      body: tokens.typography.families.body,
      korean: tokens.typography.families.korean,
    },
    customCss: (settings.customCss as string | undefined) ?? '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTheme(schema: string): Promise<ThemeResponse> {
  const rows = await prisma.$queryRawUnsafe<ThemeRow[]>(
    `SELECT id, name, is_active, settings, created_at, updated_at
     FROM "${schema}".themes
     WHERE is_active = true
     LIMIT 1`,
  );

  if (rows.length === 0) {
    // Return a default theme response
    return {
      id: '',
      templateName: 'modern',
      colors: {},
      fonts: {},
      customCss: '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return mapThemeRow(rows[0]!);
}

/**
 * Return the DesignTokens (b2bsmart-shaped) for the active theme. Reads the
 * same `themes.settings` JSONB the legacy editor wrote into and projects it
 * through `legacyThemeToTokens()` — so tenants that never touched the new
 * editor still get a valid token snapshot built from their existing
 * colors/fonts. If the row already carries `tokensV2`, that wins.
 */
export async function getThemeTokens(schema: string): Promise<DesignTokens> {
  const rows = await prisma.$queryRawUnsafe<ThemeRow[]>(
    `SELECT id, name, is_active, settings, created_at, updated_at
     FROM "${schema}".themes
     WHERE is_active = true
     LIMIT 1`,
  );
  const settings = (rows[0]?.settings ?? {}) as LegacyThemeBlob;
  return legacyThemeToTokens(settings);
}

/**
 * Persist a full DesignTokens snapshot under `settings.tokensV2`. The legacy
 * colors/fonts/customCss fields are left untouched so the old editor
 * continues to render — the next read of getThemeTokens will prefer
 * tokensV2 over the legacy projection.
 */
export async function updateThemeTokens(
  schema: string,
  tokens: DesignTokens,
): Promise<DesignTokens> {
  const existing = await prisma.$queryRawUnsafe<ThemeRow[]>(
    `SELECT id, settings FROM "${schema}".themes WHERE is_active = true LIMIT 1`,
  );
  const current = (existing[0]?.settings ?? {}) as Record<string, unknown>;
  const merged = { ...current, tokensV2: tokens };

  if (existing.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".themes
       SET settings = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      JSON.stringify(merged),
      existing[0]!.id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".themes (name, is_active, settings)
       VALUES ('modern', true, $1::jsonb)`,
      JSON.stringify(merged),
    );
  }
  return tokens;
}

export async function updateTheme(
  schema: string,
  input: UpdateThemeInput,
): Promise<ThemeResponse> {
  // Get current active theme
  const existing = await prisma.$queryRawUnsafe<ThemeRow[]>(
    `SELECT id, name, is_active, settings, created_at, updated_at
     FROM "${schema}".themes
     WHERE is_active = true
     LIMIT 1`,
  );

  const currentSettings =
    existing.length > 0
      ? ((existing[0]!.settings ?? {}) as Record<string, unknown>)
      : {};

  // Merge new settings
  const newSettings: Record<string, unknown> = { ...currentSettings };
  if (input.templateName !== undefined) {
    newSettings.templateName = input.templateName;
  }
  if (input.colors !== undefined) {
    newSettings.colors = {
      ...((currentSettings.colors as Record<string, unknown>) ?? {}),
      ...input.colors,
    };
  }
  if (input.fonts !== undefined) {
    newSettings.fonts = {
      ...((currentSettings.fonts as Record<string, unknown>) ?? {}),
      ...input.fonts,
    };
  }
  if (input.customCss !== undefined) {
    newSettings.customCss = input.customCss;
  }
  // Phase 11-A2 (2026-06-02): AI builder의 applyDesignToTheme 가 typography
  // 와 tokensV2 를 같은 PUT /theme 으로 보냄. 단순 merge 로 처리하고
  // legacyThemeToTokens() 가 read 시 합성하도록 위임.
  if ((input as { typography?: unknown }).typography !== undefined) {
    newSettings.typography = (input as { typography?: unknown }).typography;
  }
  if ((input as { tokensV2?: unknown }).tokensV2 !== undefined) {
    newSettings.tokensV2 = (input as { tokensV2?: unknown }).tokensV2;
  }

  let rows: ThemeRow[];

  if (existing.length > 0) {
    const newName = input.templateName ?? existing[0]!.name;
    rows = await prisma.$queryRawUnsafe<ThemeRow[]>(
      `UPDATE "${schema}".themes
       SET name = $1, settings = $2::jsonb, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, is_active, settings, created_at, updated_at`,
      newName,
      JSON.stringify(newSettings),
      existing[0]!.id,
    );
  } else {
    // Create new theme row
    const name = input.templateName ?? 'modern';
    rows = await prisma.$queryRawUnsafe<ThemeRow[]>(
      `INSERT INTO "${schema}".themes (name, is_active, settings)
       VALUES ($1, true, $2::jsonb)
       RETURNING id, name, is_active, settings, created_at, updated_at`,
      name,
      JSON.stringify(newSettings),
    );
  }

  if (rows.length === 0) {
    throw new AppError('UPDATE_FAILED', 500, 'Failed to update theme');
  }

  return mapThemeRow(rows[0]!);
}
