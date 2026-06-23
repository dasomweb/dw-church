import { prisma } from '../../config/database.js';

export interface MarketingConfigInput {
  logoUrl?: string | null;
  logoHeight?: number | null;
  faviconUrl?: string | null;
  siteName?: string | null;
  tagline?: string | null;
  contactEmail?: string | null;
  kakaoUrl?: string | null;
}

const COLUMN_MAP: Record<keyof MarketingConfigInput, string> = {
  logoUrl: 'logo_url',
  logoHeight: 'logo_height',
  faviconUrl: 'favicon_url',
  siteName: 'site_name',
  tagline: 'tagline',
  contactEmail: 'contact_email',
  kakaoUrl: 'kakao_url',
};

type Row = {
  logo_url: string | null; logo_height: number | null; favicon_url: string | null;
  site_name: string | null; tagline: string | null; contact_email: string | null; kakao_url: string | null;
};

/** Normalize the DB row to the camelCase client shape (always all keys). */
export function toClient(row: Row | null) {
  return {
    logoUrl: row?.logo_url ?? null,
    logoHeight: row?.logo_height ?? null,
    faviconUrl: row?.favicon_url ?? null,
    siteName: row?.site_name ?? null,
    tagline: row?.tagline ?? null,
    contactEmail: row?.contact_email ?? null,
    kakaoUrl: row?.kakao_url ?? null,
  };
}

export async function getMarketingConfig(): Promise<Row | null> {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT logo_url, logo_height, favicon_url, site_name, tagline, contact_email, kakao_url
     FROM public.marketing_config WHERE id = 1`,
  );
  return rows[0] ?? null;
}

/** Convenience accessor used by email senders. */
export async function getKakaoUrl(): Promise<string | null> {
  try {
    return (await getMarketingConfig())?.kakao_url ?? null;
  } catch {
    return null; // table missing / pre-migration — just omit the button
  }
}

/** Partial update — only provided fields are written (won't clobber others). */
export async function setMarketingConfig(input: MarketingConfigInput) {
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) {
      set.push(`"${col}" = $${i++}`);
      vals.push(v ?? null);
    }
  }
  if (set.length > 0) {
    set.push('updated_at = NOW()');
    await prisma.$executeRawUnsafe(`UPDATE public.marketing_config SET ${set.join(', ')} WHERE id = 1`, ...vals);
  }
  return getMarketingConfig();
}
