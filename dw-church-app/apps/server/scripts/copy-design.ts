/**
 * Copy DESIGN from 라그란지한인침례교회 (source) → 다솜교회 (target):
 *   - theme settings (fonts, typography, colors, tokensV2, customCss, name) — no images
 *   - hero_banner layout props on the target: layout='full', textAlign='center'
 *     (mirrors LaGrange's hero look). Background images / text content untouched.
 *
 * SAFE BY DEFAULT: dry-run (prints what would change). Set APPLY=1 to write.
 * Always writes a JSON backup of the target's current theme + hero props first.
 *
 * Run (from apps/server), dry-run:
 *   railway run --service Postgres -- pnpm exec tsx scripts/copy-design.ts
 * Apply:
 *   APPLY=1 railway run --service Postgres -- pnpm exec tsx scripts/copy-design.ts
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';

const SOURCE_SLUG = 'lagrangechurch';
const TARGET_SLUG = 'dasom';
const APPLY = process.env.APPLY === '1';

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_PUBLIC_URL / DATABASE_URL'); process.exit(1); }
const prisma = new PrismaClient({ datasources: { db: { url } } });

function schemaFor(slug: string): string {
  if (!/^[a-z0-9_]+$/.test(slug)) throw new Error('unsafe slug: ' + slug);
  return `tenant_${slug}`;
}

async function activeTheme(schema: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; settings: any }>>(
    `SELECT id, name, settings FROM "${schema}".themes WHERE is_active = true ORDER BY updated_at DESC LIMIT 1`,
  );
  return rows[0] ?? null;
}

async function main() {
  const src = schemaFor(SOURCE_SLUG);
  const tgt = schemaFor(TARGET_SLUG);
  console.log(`MODE: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}`);
  console.log(`SOURCE = ${src}  →  TARGET = ${tgt}\n`);

  // --- Theme ---
  const srcTheme = await activeTheme(src);
  const tgtTheme = await activeTheme(tgt);
  if (!srcTheme) throw new Error('source theme not found');
  if (!tgtTheme) throw new Error('target theme not found');

  const srcFonts = JSON.stringify(srcTheme.settings?.fonts);
  const tgtFonts = JSON.stringify(tgtTheme.settings?.fonts);
  console.log('THEME:');
  console.log(`  target fonts  ${tgtFonts}  →  ${srcFonts}`);
  console.log(`  target colors → source colors (${JSON.stringify(srcTheme.settings?.colors)})`);
  console.log(`  typography keys: src=${srcTheme.settings?.typography ? Object.keys(srcTheme.settings.typography).length : 0} tgt(before)=${tgtTheme.settings?.typography ? Object.keys(tgtTheme.settings.typography).length : 0}`);
  console.log(`  tokensV2: src keys=${srcTheme.settings?.tokensV2 ? Object.keys(srcTheme.settings.tokensV2).join(',') : '-'}`);

  // --- Hero sections on target ---
  const heroes = await prisma.$queryRawUnsafe<Array<{ id: string; props: any; page_slug: string }>>(
    `SELECT ps.id, ps.props, p.slug AS page_slug
     FROM "${tgt}".page_sections ps JOIN "${tgt}".pages p ON p.id = ps.page_id
     WHERE ps.block_type = 'hero_banner'`,
  );
  console.log(`\nHERO (target ${tgt}): ${heroes.length} sections → set layout='full', textAlign='center'`);
  const heroChanges = heroes.map((h) => {
    const p = h.props ?? {};
    return { id: h.id, page: h.page_slug, fromLayout: p.layout, fromAlign: p.textAlign };
  });
  for (const c of heroChanges) {
    console.log(`  · ${c.page}: layout ${c.fromLayout}→full, textAlign ${c.fromAlign}→center`);
  }

  // --- Backup (always) ---
  const backup = {
    when: process.env.BACKUP_STAMP || 'manual',
    target: tgt,
    theme: { id: tgtTheme.id, name: tgtTheme.name, settings: tgtTheme.settings },
    heroes: heroes.map((h) => ({ id: h.id, page_slug: h.page_slug, props: h.props })),
  };
  const backupPath = `scripts/backup-${TARGET_SLUG}-design.json`;
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`\nBackup written: apps/server/${backupPath}`);

  if (!APPLY) {
    console.log('\nDRY-RUN complete. Re-run with APPLY=1 to write these changes.');
    await prisma.$disconnect();
    return;
  }

  // --- Apply: theme settings (whole settings JSON copied; theme has no image fields) ---
  await prisma.$executeRawUnsafe(
    `UPDATE "${tgt}".themes SET settings = $1::jsonb, name = $2, updated_at = NOW() WHERE id = $3::uuid`,
    JSON.stringify(srcTheme.settings),
    srcTheme.name,
    tgtTheme.id,
  );
  console.log('\n✓ theme settings copied (source → target)');

  // --- Apply: hero layout props (preserve everything else incl. images/content) ---
  let n = 0;
  for (const h of heroes) {
    const next = { ...(h.props ?? {}), layout: 'full', textAlign: 'center' };
    await prisma.$executeRawUnsafe(
      `UPDATE "${tgt}".page_sections SET props = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`,
      JSON.stringify(next),
      h.id,
    );
    n++;
  }
  console.log(`✓ hero layout updated on ${n} sections`);
  console.log('\nAPPLY complete.');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
