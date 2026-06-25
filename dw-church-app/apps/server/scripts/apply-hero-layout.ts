/**
 * Copy only the HERO BANNER layout/height/style from 라그란지 → 다솜, per matching
 * page. Theme is NOT touched. Background images / titles / buttons stay as the
 * Dasom original (taken from the backup, so any earlier accidental edits are
 * also cleaned up). Unmapped Dasom pages keep their ORIGINAL props.
 *
 * Layout keys copied from LaGrange: layout, height, textAlign, overlay,
 * overlayColor, overlayOpacity, contentWidth, verticalAlign (whichever exist).
 *
 * Dry-run by default; APPLY=1 to write.
 *   railway run --service Postgres -- pnpm exec tsx scripts/apply-hero-layout.ts
 *   APPLY=1 railway run --service Postgres -- pnpm exec tsx scripts/apply-hero-layout.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

const APPLY = process.env.APPLY === '1';
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) { console.error('No DB url'); process.exit(1); }
const prisma = new PrismaClient({ datasources: { db: { url } } });

const SRC = 'tenant_lagrangechurch';
const backup = JSON.parse(readFileSync('scripts/backup-dasom-design.json', 'utf8'));
const TGT: string = backup.target; // tenant_dasom
if (!/^tenant_[a-z0-9_]+$/.test(TGT)) throw new Error('unsafe target');

// Dasom page slug → LaGrange page slug (same page purpose).
const MAP: Record<string, string> = {
  'about-vision': 'vision',
  'about-history': 'history',
  'about-staff': 'staff',
  'about-worship-info': 'worship',
  'sermons': 'sermons',
  'bulletins': 'bulletins',
  'pastoral-column': 'columns',
  'community-events': 'events',
  'community-gallery': 'albums',
  'community-board': 'news',
  'newcomers': 'newcomer-info',
  'contact': 'directions',
  // unmapped: home, community-ministries → keep Dasom original
};

const LAYOUT_KEYS = ['layout', 'height', 'textAlign', 'overlay', 'overlayColor', 'overlayOpacity', 'contentWidth', 'verticalAlign'];

async function main() {
  console.log(`MODE: ${APPLY ? 'APPLY' : 'DRY-RUN'}  ${SRC} → ${TGT} (hero layout only)\n`);

  // LaGrange hero props by page slug
  const srcRows = await prisma.$queryRawUnsafe<Array<{ page_slug: string; props: any }>>(
    `SELECT p.slug AS page_slug, ps.props FROM "${SRC}".page_sections ps
     JOIN "${SRC}".pages p ON p.id = ps.page_id WHERE ps.block_type = 'hero_banner'`,
  );
  const srcBySlug = new Map(srcRows.map((r) => [r.page_slug, r.props ?? {}]));

  // Current Dasom hero section ids by page slug (to know what to UPDATE)
  const tgtRows = await prisma.$queryRawUnsafe<Array<{ id: string; page_slug: string }>>(
    `SELECT ps.id, p.slug AS page_slug FROM "${TGT}".page_sections ps
     JOIN "${TGT}".pages p ON p.id = ps.page_id WHERE ps.block_type = 'hero_banner'`,
  );
  const idBySlug = new Map(tgtRows.map((r) => [r.page_slug, r.id]));

  // Base = ORIGINAL Dasom hero props from the backup (undoes earlier full/center edit)
  const updates: Array<{ id: string; page: string; props: any; note: string }> = [];
  for (const h of backup.heroes as Array<{ page_slug: string; props: any }>) {
    const id = idBySlug.get(h.page_slug);
    if (!id) continue;
    const base = { ...(h.props ?? {}) };
    const srcSlug = MAP[h.page_slug];
    if (srcSlug && srcBySlug.has(srcSlug)) {
      const srcProps = srcBySlug.get(srcSlug);
      const picked: Record<string, unknown> = {};
      for (const k of LAYOUT_KEYS) if (srcProps[k] !== undefined) picked[k] = srcProps[k];
      const next = { ...base, ...picked };
      updates.push({ id, page: h.page_slug, props: next, note: `← ${srcSlug}: ${LAYOUT_KEYS.filter((k) => picked[k] !== undefined).map((k) => `${k}=${picked[k]}`).join(' ')}` });
    } else {
      updates.push({ id, page: h.page_slug, props: base, note: '(unmapped → restore Dasom original)' });
    }
  }

  for (const u of updates) {
    console.log(`  ${u.page}: layout=${u.props.layout} height=${u.props.height} textAlign=${u.props.textAlign} overlay=${u.props.overlayColor ?? u.props.overlay ?? '-'}  ${u.note}`);
  }

  if (!APPLY) { console.log('\nDRY-RUN. Set APPLY=1 to write.'); await prisma.$disconnect(); return; }

  let n = 0;
  for (const u of updates) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${TGT}".page_sections SET props = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`,
      JSON.stringify(u.props), u.id,
    );
    n++;
  }
  console.log(`\n✓ updated ${n} hero sections (theme untouched)`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
