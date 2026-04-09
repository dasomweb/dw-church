/**
 * Config Applier — handles configuration-type data:
 * staff, history, worshipTimes, menus.
 * These are "set once" data, not posting-style.
 */

import { prisma } from '../../../config/database.js';
import { validateSchemaName } from '../../../utils/validate-schema.js';
import type {
  ClassifiedStaff,
  ClassifiedHistoryItem,
  ClassifiedWorshipTime,
  ClassifiedMenu,
} from '../types.js';
import type { ImageUrlMap } from './images.js';

// ─── Staff ──────────────────────────────────────────────────

export async function applyStaff(
  tenantSlug: string,
  staff: ClassifiedStaff[],
  urlMap: ImageUrlMap,
): Promise<number> {
  if (staff.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  for (let i = 0; i < staff.length; i++) {
    const s = staff[i]!;
    const photo = urlMap.get(s.photoUrl) || s.photoUrl;
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".staff (name, role, department, photo_url, bio, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT DO NOTHING`,
        s.name || '',
        s.role || '',
        s.department || '',
        photo,
        s.bio || '',
        i,
      );
      count++;
    } catch {
      // Skip
    }
  }

  return count;
}

// ─── History ────────────────────────────────────────────────
// DB: year (INT UNIQUE) + items (JSONB array)
// Group items by year before inserting

export async function applyHistory(
  tenantSlug: string,
  history: ClassifiedHistoryItem[],
): Promise<number> {
  if (history.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);

  // Group by year
  const byYear = new Map<number, { month: string; title: string; description: string }[]>();
  for (const h of history) {
    if (!byYear.has(h.year)) byYear.set(h.year, []);
    byYear.get(h.year)!.push({
      month: h.month,
      title: h.title,
      description: h.description,
    });
  }

  let count = 0;
  for (const [year, items] of byYear) {
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".history (year, items)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (year) DO UPDATE SET items = $2::jsonb, updated_at = NOW()`,
        year,
        JSON.stringify(items),
      );
      count++;
    } catch {
      // Skip
    }
  }

  return count;
}

// ─── Worship Times ──────────────────────────────────────────
// Stored as props in the worship_times block of the worship page

export async function applyWorshipTimes(
  tenantSlug: string,
  worshipTimes: ClassifiedWorshipTime[],
): Promise<number> {
  if (worshipTimes.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);

  // Find worship_times block in the worship page
  const sections = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT ps.id FROM "${schema}".page_sections ps
     JOIN "${schema}".pages p ON ps.page_id = p.id
     WHERE p.slug = 'worship' AND ps.block_type = 'worship_times'
     ORDER BY ps.sort_order LIMIT 1`,
  );

  if (sections.length > 0) {
    await prisma.$queryRawUnsafe(
      `UPDATE "${schema}".page_sections
       SET props = jsonb_set(props, '{services}', $1::jsonb)
       WHERE id = $2::uuid`,
      JSON.stringify(worshipTimes),
      sections[0]!.id,
    );
    return worshipTimes.length;
  }

  // Fallback: also store as setting for reference
  await prisma.$queryRawUnsafe(
    `INSERT INTO "${schema}".settings (key, value)
     VALUES ('worship_times', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    JSON.stringify(worshipTimes),
  );

  return worshipTimes.length;
}

// ─── Menus ──────────────────────────────────────────────────
// Assumption: menus already seeded by seedDefaultData.
// Migration updates labels and sort order but doesn't restructure.
// Full menu migration is complex — for now, skip and let admin handle.

export async function applyMenus(
  _tenantSlug: string,
  _menus: ClassifiedMenu[],
): Promise<number> {
  // Menus are already seeded with proper structure.
  // Auto-migrating menus risks breaking existing nav structure.
  // Admin should adjust menus manually after migration.
  return 0;
}
