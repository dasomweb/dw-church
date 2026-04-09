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

  const map: Record<string, string> = {
    church_name: churchInfo.name,
    church_address: churchInfo.address,
    church_phone: churchInfo.phone,
    church_email: churchInfo.email,
    seo_description: churchInfo.description,
  };

  for (const [key, value] of Object.entries(map)) {
    if (!value) continue;
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${schema}".settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      key,
      value,
    );
    count++;
  }

  return count;
}
