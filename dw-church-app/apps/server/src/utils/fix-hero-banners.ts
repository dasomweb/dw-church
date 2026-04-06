/**
 * One-time migration: normalize hero_banner props for existing tenants.
 * Fills in missing height, layout, textAlign defaults.
 * Also converts any remaining hero_full_width to hero_banner.
 *
 * Run via: import and call from a server startup hook or API endpoint.
 */
import { prisma } from '../config/database.js';

const DEFAULT_HERO_PROPS = {
  height: 'md',
  layout: 'full',
  textAlign: 'center',
};

export async function fixHeroBanners(): Promise<number> {
  // Get all tenant schemas
  const tenants = await prisma.$queryRawUnsafe<{ slug: string }[]>(
    `SELECT slug FROM public.tenants WHERE is_active = true`,
  );

  let totalFixed = 0;

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`;

    // 1. Convert hero_full_width → hero_banner
    const converted = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `UPDATE "${schema}".page_sections
       SET block_type = 'hero_banner'
       WHERE block_type = 'hero_full_width'
       RETURNING id`,
    );
    totalFixed += converted.length;

    // 2. Fill missing props on hero_banner sections
    const heroSections = await prisma.$queryRawUnsafe<{ id: string; page_id: string; props: Record<string, unknown> }[]>(
      `SELECT id, page_id, props FROM "${schema}".page_sections WHERE block_type = 'hero_banner'`,
    );

    for (const section of heroSections) {
      const props = section.props || {};
      let needsUpdate = false;

      for (const [key, defaultVal] of Object.entries(DEFAULT_HERO_PROPS)) {
        if (props[key] === undefined || props[key] === null) {
          props[key] = defaultVal;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await prisma.$queryRawUnsafe(
          `UPDATE "${schema}".page_sections SET props = $1::jsonb WHERE id = $2::uuid`,
          JSON.stringify(props),
          section.id,
        );
        totalFixed++;
      }
    }
  }

  return totalFixed;
}
