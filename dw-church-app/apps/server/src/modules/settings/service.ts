import { prisma } from '../../config/database.js';

const ALLOWED_KEYS = [
  'church_name',
  'church_address',
  'church_phone',
  'church_email',
  'church_website',
  // Branding
  'logo_url',
  'favicon_url',
  // SEO
  'seo_title',
  'seo_description',
  'seo_keywords',
  'og_image_url',
  // SNS
  'social_youtube',
  'social_instagram',
  'social_facebook',
  'social_linkedin',
  'social_tiktok',
  'social_kakaotalk',
  'social_kakaotalk_channel',
  'staff_display',
] as const;

export type SettingKey = (typeof ALLOWED_KEYS)[number];

export function isValidKey(key: string): key is SettingKey {
  return (ALLOWED_KEYS as readonly string[]).includes(key);
}

export async function getAllSettings(schema: string): Promise<Record<string, string>> {
  const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
    `SELECT key, value FROM "${schema}".settings`,
  );
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function upsertSettings(
  schema: string,
  settings: Record<string, string | null>,
): Promise<Record<string, string>> {
  for (const [key, rawValue] of Object.entries(settings)) {
    if (!isValidKey(key)) continue;
    const value = typeof rawValue === 'object' && rawValue !== null ? JSON.stringify(rawValue) : rawValue;

    if (value === null || value === '') {
      await prisma.$queryRawUnsafe(
        `DELETE FROM "${schema}".settings WHERE key = $1`,
        key,
      );
    } else {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        key,
        value,
      );
    }
  }

  return getAllSettings(schema);
}
