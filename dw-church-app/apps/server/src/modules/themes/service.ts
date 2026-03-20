import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
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

function mapThemeRow(row: ThemeRow): ThemeResponse {
  const settings = (row.settings ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    templateName: (settings.templateName as string) ?? row.name ?? 'modern',
    colors: (settings.colors as Record<string, unknown>) ?? {},
    fonts: (settings.fonts as Record<string, unknown>) ?? {},
    customCss: (settings.customCss as string) ?? '',
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
