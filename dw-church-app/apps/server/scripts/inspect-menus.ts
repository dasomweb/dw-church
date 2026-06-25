/**
 * READ-ONLY: list 다솜교회 menus to spot stray English groups (About/Community).
 *   railway run --service Postgres -- pnpm exec tsx scripts/inspect-menus.ts
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) { console.error('No DB url'); process.exit(1); }
const prisma = new PrismaClient({ datasources: { db: { url } } });
const SCHEMA = 'tenant_dasom';

async function main() {
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT m.id, m.label, m.page_id, m.parent_id, m.sort_order, m.is_visible,
            p.slug AS page_slug
     FROM "${SCHEMA}".menus m
     LEFT JOIN "${SCHEMA}".pages p ON p.id = m.page_id
     ORDER BY (m.parent_id IS NOT NULL), m.sort_order, m.label`,
  );
  console.log(`menus: ${rows.length}`);
  const top = rows.filter((r) => !r.parent_id);
  const children = rows.filter((r) => r.parent_id);
  for (const t of top) {
    console.log(`• ${t.label}  | page=${t.page_slug ?? '(group)'} | id=${t.id} | visible=${t.is_visible}`);
    for (const c of children.filter((c) => c.parent_id === t.id)) {
      console.log(`    └ ${c.label} | page=${c.page_slug ?? '(group)'} | id=${c.id}`);
    }
  }
  const orphans = children.filter((c) => !top.some((t) => t.id === c.parent_id));
  if (orphans.length) {
    console.log('\nORPHAN children (parent not top-level):');
    for (const o of orphans) console.log(`    ? ${o.label} | page=${o.page_slug ?? '(group)'} | parent=${o.parent_id}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
