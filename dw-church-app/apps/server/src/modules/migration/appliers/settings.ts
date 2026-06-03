/**
 * Settings Applier — churchInfo → settings table.
 */

import { prisma } from '../../../config/database.js';
import { validateSchemaName } from '../../../utils/validate-schema.js';
import type { ChurchInfo } from '../types.js';

export async function applySettings(
  tenantSlug: string,
  churchInfo: ChurchInfo,
): Promise<number> {
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  // Phase 12-γ.2 (2026-06-03): added 7 SEO/branding keys harvested from
  // source <head>. Operator-edited values are preserved — we use
  // DO NOTHING when the row exists (project_migration_seo_extraction
  // §4: "Don't overwrite operator-provided values").
  const map: Record<string, string> = {
    church_name: churchInfo.name,
    church_address: churchInfo.address,
    church_phone: churchInfo.phone,
    church_email: churchInfo.email,
    church_description: churchInfo.description,
    church_slogan: churchInfo.slogan,
    seo_title: churchInfo.seoTitle,
    seo_description: churchInfo.seoDescription || churchInfo.description,
    seo_keywords: churchInfo.seoKeywords,
    og_image_url: churchInfo.ogImageUrl,
    logo_url: churchInfo.logoUrl,
    site_locale: churchInfo.locale,
  };

  for (const [key, value] of Object.entries(map)) {
    if (!value) continue;
    // DO NOTHING: on re-migration we keep the operator's edits intact.
    // First-time migration still writes because the row doesn't exist yet.
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${schema}".settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      key,
      value,
    );
    count++;
  }

  return count;
}
