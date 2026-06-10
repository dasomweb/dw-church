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

/**
 * Map a nav LABEL to a canonical page slug. The migration agent extracts the
 * source nav but its per-item `pageSlug` guess often doesn't match our seeded
 * slugs (e.g. it emits "" or the source URL slug). Without this, dynamic
 * content pages (설교/주보/칼럼/앨범/행사/교역자) — which DO exist as seeded pages
 * — were dropped as dead links, so the migrated nav ended up static-only.
 * Matching by label fixes that while still mirroring the SOURCE (we only link
 * sections the source nav actually names). Slugs match schema-manager seeds.
 */
function inferSlugFromLabel(label: string): string | null {
  const s = (label || '').toLowerCase().replace(/\s+/g, '');
  const has = (...kw: string[]) => kw.some((k) => s.includes(k));
  // 주보 must be checked before 설교/예배 (distinct content module).
  if (has('주보', 'jubo', 'bulletin')) return 'bulletins';
  if (has('설교', '말씀', 'sermon', 'message', 'preach')) return 'sermons';
  if (has('칼럼', '묵상', 'column', 'devotion')) return 'columns';
  if (has('앨범', '갤러리', '사진', 'gallery', 'photo', 'album')) return 'albums';
  if (has('행사', '공지', '소식', '이벤트', 'event', 'news', 'notice')) return 'events';
  if (has('교역자', '섬기는', '사역자', '목회자', 'staff', 'pastor')) return 'staff';
  if (has('연혁', '발자취', 'history')) return 'history';
  if (has('인사말', '환영', 'welcome', 'greeting', '담임')) return 'welcome';
  if (has('비전', '사명', 'vision', 'mission')) return 'vision';
  if (has('오시는', '찾아', 'location', 'direction', 'contact', '연락', '약도', '지도', 'map')) return 'directions';
  if (has('예배', 'worship', '모임', 'service')) return 'worship';
  return null;
}

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

  // Resolve each menu item to an existing page: prefer the agent's pageSlug,
  // else infer from the LABEL (설교→sermons, 주보→bulletins, …). This is the fix
  // for "migrated nav is static-only" — the source nav's dynamic content items
  // now link to the seeded pages even when the agent's slug guess was wrong.
  // The nav still MIRRORS the source: we only link sections the source names.
  const resolveSlug = (m: ClassifiedMenu): string | null => {
    if (m.pageSlug && slugToId.has(m.pageSlug)) return m.pageSlug;
    const inferred = inferSlugFromLabel(m.label);
    if (inferred && slugToId.has(inferred)) return inferred;
    return null;
  };
  const resolved = menus.map((m) => ({ item: m, slug: resolveSlug(m) }));
  const parentLabels = new Set(menus.map((m) => m.parentLabel).filter(Boolean));
  const linkedCount = resolved.filter((r) => r.slug).length;

  // Safety: a near-empty source nav is worse than the seeded structure.
  // Only take over the nav when at least 2 real pages mapped.
  if (linkedCount < 2) return 0;

  // Replace the default seeded nav (migration is a setup step; operator
  // curates after). Wiping first keeps re-imports idempotent and avoids
  // default+source duplication.
  await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".menus`);

  const sorted = [...resolved].sort((a, b) => a.item.sortOrder - b.item.sortOrder);
  const labelToId = new Map<string, string>();
  let count = 0;

  const insert = async (r: { item: ClassifiedMenu; slug: string | null }, parentId: string | null): Promise<void> => {
    const pageId = r.slug ? slugToId.get(r.slug) ?? null : null;
    // Keep group headers (a parent with children) even with no page; drop a
    // leaf that resolves to no page (it would be a dead link).
    const isHeader = parentLabels.has(r.item.label);
    if (!pageId && !isHeader) return;
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${schema}".menus (label, page_id, parent_id, sort_order, is_visible)
       VALUES ($1, $2::uuid, $3::uuid, $4, true)
       RETURNING id`,
      r.item.label,
      pageId,
      parentId,
      r.item.sortOrder,
    );
    if (rows[0]) {
      labelToId.set(r.item.label, rows[0].id);
      count++;
    }
  };

  // Parents first (parentLabel == null) so children can resolve parent_id
  // by label; then children.
  for (const r of sorted) {
    if (!r.item.parentLabel) await insert(r, null);
  }
  for (const r of sorted) {
    if (r.item.parentLabel) await insert(r, labelToId.get(r.item.parentLabel) ?? null);
  }

  return count;
}
