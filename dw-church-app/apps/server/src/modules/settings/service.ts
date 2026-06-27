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
  // Web App (PWA) bottom tabs — JSON array of menu item ids (max 5)
  'web_app_tab_ids',
  'web_app_tab_icons',
] as const;

export type SettingKey = (typeof ALLOWED_KEYS)[number];

export function isValidKey(key: string): key is SettingKey {
  return (ALLOWED_KEYS as readonly string[]).includes(key);
}

// The api-client sends camelCase bodies (snakeize-on-send was removed so Zod
// schemas keep their camelCase fields). Settings are stored snake_case (and the
// storefront reads church_name etc.), so convert incoming keys before the
// whitelist check. Idempotent for keys that are already snake_case.
//   churchName → church_name, logoUrl → logo_url, socialKakaotalkChannel →
//   social_kakaotalk_channel.
function toSnakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
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
  for (const [rawKey, rawValue] of Object.entries(settings)) {
    const key = toSnakeKey(rawKey);
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
