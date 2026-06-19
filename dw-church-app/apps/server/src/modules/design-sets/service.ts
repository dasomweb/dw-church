import { prisma } from '../../config/database.js';
import { updateThemeTokens } from '../themes/service.js';
import type { DesignTokens } from '@dw-church/design-tokens';
import type { CreateDesignSetInput, UpdateDesignSetInput } from './schema.js';

export async function listDesignSets(schema: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, name, source, tokens, created_at, updated_at
     FROM "${schema}".design_sets ORDER BY created_at DESC`,
  );
}

export async function getDesignSet(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, name, source, tokens, created_at, updated_at
     FROM "${schema}".design_sets WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createDesignSet(schema: string, input: CreateDesignSetInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".design_sets (name, source, tokens)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, name, source, tokens, created_at, updated_at`,
    input.name,
    input.source ?? 'manual',
    JSON.stringify(input.tokens),
  );
  return rows[0];
}

export async function updateDesignSet(schema: string, id: string, input: UpdateDesignSetInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) {
    setClauses.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.tokens !== undefined) {
    setClauses.push(`tokens = $${i++}::jsonb`);
    values.push(JSON.stringify(input.tokens));
  }
  if (setClauses.length === 0) return getDesignSet(schema, id);
  setClauses.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".design_sets SET ${setClauses.join(', ')} WHERE id = $${i}::uuid
     RETURNING id, name, source, tokens, created_at, updated_at`,
    ...values,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteDesignSet(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".design_sets WHERE id = $1::uuid`, id);
}

/**
 * Apply a saved set: copy its tokens into the tenant's LIVE theme. Reuses the
 * themes service so the storage path (themes.settings.tokensV2) + emit stay
 * identical to a normal theme save. Returns the applied tokens.
 */
export async function applyDesignSet(schema: string, id: string): Promise<DesignTokens | null> {
  const row = await getDesignSet(schema, id);
  if (!row) return null;
  const tokens = row.tokens as DesignTokens;
  return updateThemeTokens(schema, tokens);
}

/**
 * Save the current design as an 'ai' set — called by the AI builder after it
 * applies a generated design, so each build is preserved + switchable. Best-
 * effort: callers wrap in try/catch so a save failure never fails the build.
 */
export async function saveAiDesignSet(schema: string, name: string, tokens: DesignTokens) {
  return createDesignSet(schema, { name, source: 'ai', tokens });
}
