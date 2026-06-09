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
// The source site's navigation (사이트맵) replaces the default seeded nav.
// Before this, applyMenus was a no-op, so every migrated tenant kept the
// generic seed menu (교회안내/예배 및 모임/교육/…) instead of its own sitemap
// — i.e. the nav didn't match the church. The migration agent already
// extracts the source nav into data.menus ({label, pageSlug, parentLabel,
// sortOrder}); here we map each item to the migrated page and rebuild the
// tenant's nav to mirror the source.

/** Canonical Korean labels + order for the standard church page slugs.
 *  Used by the deterministic fallback (deriveMenusFromPages) when the agent
 *  didn't return a nav. Mirrors the slugs in pages.ts / the agent schema. */
const PAGE_NAV: Record<string, { label: string; order: number }> = {
  'pastor-greeting': { label: '인사말', order: 1 },
  about: { label: '교회소개', order: 2 },
  vision: { label: '비전', order: 3 },
  history: { label: '연혁', order: 4 },
  staff: { label: '섬기는 사람들', order: 5 },
  worship: { label: '예배안내', order: 6 },
  mission: { label: '선교', order: 7 },
  newcomer: { label: '새가족', order: 8 },
  directions: { label: '오시는 길', order: 9 },
  sermons: { label: '설교', order: 10 },
  bulletins: { label: '주보', order: 11 },
  columns: { label: '목회칼럼', order: 12 },
  albums: { label: '앨범', order: 13 },
  events: { label: '행사', order: 14 },
  board: { label: '게시판', order: 15 },
};

/** Dynamic content module pages that should always appear in the migrated nav
 *  when they exist as pages (the seed creates them; content fills in via the
 *  per-module import). slugs match schema-manager.ts seed page slugs. */
const DYNAMIC_CONTENT_NAV: { slug: string; label: string; order: number }[] = [
  { slug: 'sermons',   label: '설교',          order: 50 },
  { slug: 'bulletins', label: '주보',          order: 51 },
  { slug: 'columns',   label: '목회칼럼',       order: 52 },
  { slug: 'albums',    label: '갤러리',         order: 53 },
  { slug: 'events',    label: '행사',          order: 54 },
  { slug: 'staff',     label: '섬기는 사람들',   order: 55 },
];

/**
 * Fallback nav when the agent returned no menus: build a flat nav from the
 * pages that were actually migrated, in canonical church order. 'home' is
 * excluded (the logo links home). Guarantees the migrated site never falls
 * back to the irrelevant default seed menu.
 */
export function deriveMenusFromPages(
  pageContents: { pageSlug: string }[],
): ClassifiedMenu[] {
  const seen = new Set<string>();
  const out: ClassifiedMenu[] = [];
  for (const p of pageContents) {
    if (p.pageSlug === 'home' || seen.has(p.pageSlug)) continue;
    seen.add(p.pageSlug);
    const meta = PAGE_NAV[p.pageSlug];
    out.push({
      label: meta?.label ?? p.pageSlug,
      pageSlug: p.pageSlug,
      parentLabel: null,
      sortOrder: meta?.order ?? 99,
    });
  }
  return out;
}

export async function applyMenus(
  tenantSlug: string,
  menus: ClassifiedMenu[],
): Promise<number> {
  if (menus.length === 0) return 0; // nothing extracted → keep default seed
  const schema = validateSchemaName(`tenant_${tenantSlug}`);

  // Resolve each menu item's target page slug → the migrated page's id.
  const pageRows = await prisma.$queryRawUnsafe<{ id: string; slug: string }[]>(
    `SELECT id, slug FROM "${schema}".pages`,
  );
  const slugToId = new Map(pageRows.map((p) => [p.slug, p.id]));

  // Drop items that point at a page that wasn't migrated (dead links) —
  // but keep group headers (no pageSlug) so the hierarchy survives.
  const usable = menus.filter((m) => !m.pageSlug || slugToId.has(m.pageSlug));

  // Dynamic content module pages (설교/주보/칼럼/앨범/행사/교역자) exist as pages
  // (the seed creates them; per-module import fills them later) but the nav we
  // extract from the source is static-focused. Without this they'd be WIPED from
  // the nav when we replace the default menu — leaving a migrated site whose
  // menu has only static pages. Re-include every dynamic content page that
  // exists in the tenant and isn't already covered, so the nav stays complete.
  const coveredSlugs = new Set(usable.map((m) => m.pageSlug).filter(Boolean));
  const dynamicAppends: ClassifiedMenu[] = DYNAMIC_CONTENT_NAV
    .filter((d) => slugToId.has(d.slug) && !coveredSlugs.has(d.slug))
    .map((d) => ({ label: d.label, pageSlug: d.slug, parentLabel: null, sortOrder: d.order }));

  const allItems = [...usable, ...dynamicAppends];
  const linked = allItems.filter((m) => m.pageSlug && slugToId.has(m.pageSlug));

  // Safety: a near-empty source nav is worse than the seeded structure.
  // Only take over the nav when at least 2 real pages mapped.
  if (linked.length < 2) return 0;

  // Replace the default seeded nav (migration is a setup step; operator
  // curates after). Wiping first keeps re-imports idempotent and avoids
  // default+source duplication.
  await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".menus`);

  const sorted = [...allItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const labelToId = new Map<string, string>();
  let count = 0;

  const insert = async (m: ClassifiedMenu, parentId: string | null): Promise<void> => {
    const pageId = m.pageSlug ? slugToId.get(m.pageSlug) ?? null : null;
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${schema}".menus (label, page_id, parent_id, sort_order, is_visible)
       VALUES ($1, $2::uuid, $3::uuid, $4, true)
       RETURNING id`,
      m.label,
      pageId,
      parentId,
      m.sortOrder,
    );
    if (rows[0]) {
      labelToId.set(m.label, rows[0].id);
      count++;
    }
  };

  // Parents first (parentLabel == null) so children can resolve parent_id
  // by label; then children.
  for (const m of sorted) {
    if (!m.parentLabel) await insert(m, null);
  }
  for (const m of sorted) {
    if (m.parentLabel) await insert(m, labelToId.get(m.parentLabel) ?? null);
  }

  return count;
}
