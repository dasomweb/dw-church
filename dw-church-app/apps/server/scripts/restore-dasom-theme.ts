/**
 * Restore ONLY the theme settings of 다솜교회 from the backup taken by
 * copy-design.ts (undo the theme overwrite). Hero sections are left as-is.
 *
 * Run (from apps/server):
 *   APPLY=1 railway run --service Postgres -- pnpm exec tsx scripts/restore-dasom-theme.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

const APPLY = process.env.APPLY === '1';
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) { console.error('No DB url'); process.exit(1); }
const prisma = new PrismaClient({ datasources: { db: { url } } });

const backup = JSON.parse(readFileSync('scripts/backup-dasom-design.json', 'utf8'));
const tgt: string = backup.target;
if (!/^tenant_[a-z0-9_]+$/.test(tgt)) throw new Error('unsafe target: ' + tgt);

async function main() {
  console.log(`MODE: ${APPLY ? 'APPLY' : 'DRY-RUN'}  target=${tgt}`);
  console.log('Restoring theme settings → fonts:', JSON.stringify(backup.theme.settings.fonts),
    '| typographyKeys:', Object.keys(backup.theme.settings.typography || {}).length);

  if (!APPLY) { console.log('DRY-RUN only. Set APPLY=1 to write.'); await prisma.$disconnect(); return; }

  await prisma.$executeRawUnsafe(
    `UPDATE "${tgt}".themes SET settings = $1::jsonb, name = $2, updated_at = NOW() WHERE id = $3::uuid`,
    JSON.stringify(backup.theme.settings),
    backup.theme.name,
    backup.theme.id,
  );
  console.log('✓ theme settings restored (hero sections untouched)');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
