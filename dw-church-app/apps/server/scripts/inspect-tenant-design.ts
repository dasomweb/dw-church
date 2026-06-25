/**
 * READ-ONLY inspection: compare the design (theme fonts/colors/tokens + hero
 * banner layout) of 다솜교회 vs 라그란지한인침례교회 in PROD. No writes.
 *
 * Run (from apps/server):
 *   railway run --service api-server -- pnpm exec tsx scripts/inspect-tenant-design.ts
 * (railway injects DATABASE_PUBLIC_URL; we connect through that.)
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('No DATABASE_PUBLIC_URL / DATABASE_URL in env');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

function schemaFor(slug: string): string {
  if (!/^[a-z0-9_]+$/.test(slug)) throw new Error('unsafe slug: ' + slug);
  return `tenant_${slug}`;
}

async function main() {
  const tenants = await prisma.$queryRawUnsafe<Array<{ slug: string; name: string; plan: string; is_active: boolean }>>(
    `SELECT slug, name, plan, is_active FROM public.tenants ORDER BY created_at`,
  );
  console.log('=== ALL TENANTS ===');
  for (const t of tenants) console.log(`  ${t.slug}\t| ${t.name}\t| ${t.plan}\t| active=${t.is_active}`);

  const dasom = tenants.find((t) => /dasom|다솜/i.test(`${t.slug} ${t.name}`));
  const lag = tenants.find((t) => /lagrange|라그란지|침례/i.test(`${t.slug} ${t.name}`));
  console.log(`\nIDENTIFIED → DASOM=${dasom?.slug ?? '(none)'}  LAGRANGE=${lag?.slug ?? '(none)'}`);

  for (const entry of [['DASOM', dasom], ['LAGRANGE', lag]] as const) {
    const [label, t] = entry;
    if (!t) { console.log(`\n[${label}] NOT FOUND`); continue; }
    const s = schemaFor(t.slug);

    const theme = await prisma
      .$queryRawUnsafe<Array<{ name: string; settings: any }>>(
        `SELECT name, settings FROM "${s}".themes WHERE is_active = true ORDER BY updated_at DESC LIMIT 1`,
      )
      .catch((e) => { console.log(`[${label}] theme query error: ${e.message}`); return []; });
    const st = theme[0]?.settings ?? {};
    console.log(`\n=== [${label}] ${t.slug} — THEME ===`);
    console.log('  themeRowName :', theme[0]?.name);
    console.log('  templateName :', st.templateName);
    console.log('  fonts        :', JSON.stringify(st.fonts));
    console.log('  colors       :', JSON.stringify(st.colors));
    console.log('  typographyKeys:', st.typography ? Object.keys(st.typography) : null);
    console.log('  hasTokensV2  :', !!st.tokensV2);
    console.log('  tokensV2.fontKeys:', st.tokensV2?.fonts ? JSON.stringify(st.tokensV2.fonts) : (st.tokensV2 ? Object.keys(st.tokensV2) : null));
    console.log('  customCssLen :', (st.customCss || '').length);

    const heroes = await prisma
      .$queryRawUnsafe<Array<{ page_slug: string; is_home: boolean; props: any }>>(
        `SELECT p.slug AS page_slug, p.is_home, ps.props
         FROM "${s}".page_sections ps JOIN "${s}".pages p ON p.id = ps.page_id
         WHERE ps.block_type = 'hero_banner' ORDER BY p.is_home DESC, p.sort_order`,
      )
      .catch((e) => { console.log(`[${label}] hero query error: ${e.message}`); return []; });
    console.log(`  hero_banner sections: ${heroes.length}`);
    for (const h of heroes) {
      const p = h.props ?? {};
      console.log(`    · page=${h.page_slug} home=${h.is_home} layout=${p.layout} height=${p.height} textAlign=${p.textAlign} overlay=${p.overlayColor ?? p.overlay ?? '-'} hasBgImage=${!!p.backgroundImageUrl} title="${String(p.title ?? '').slice(0, 24)}"`);
    }

    const sectionCounts = await prisma
      .$queryRawUnsafe<Array<{ block_type: string; n: bigint }>>(
        `SELECT block_type, COUNT(*)::int AS n FROM "${s}".page_sections GROUP BY block_type ORDER BY n DESC`,
      )
      .catch(() => []);
    console.log('  section block_types:', sectionCounts.map((r) => `${r.block_type}×${r.n}`).join(', '));
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
