import { prisma } from '../../config/database.js';

// truelight.app home hero slide — bilingual copy + a self-hosted (R2) image +
// optional CTA buttons (variant keeps the existing colors: primary = blue,
// outline = white border, demo = the demo-request modal button).
export interface HeroSlideButton {
  labelKo: string;
  labelEn: string;
  url: string;
  variant: 'primary' | 'outline' | 'demo';
}
export interface HeroSlide {
  headlineKo: string;
  headlineEn: string;
  sublineKo: string;
  sublineEn: string;
  imageUrl: string;
  buttons?: HeroSlideButton[];
}

export interface MarketingConfigInput {
  logoUrl?: string | null;
  logoHeight?: number | null;
  faviconUrl?: string | null;
  siteName?: string | null;
  tagline?: string | null;
  contactEmail?: string | null;
  kakaoUrl?: string | null;
  ogImageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  headerPaddingY?: number | null;
  footerPaddingY?: number | null;
  heroSlides?: HeroSlide[] | null;
  baseFontPx?: number | null;
  heroMobileRatio?: string | null;
}

const COLUMN_MAP: Record<keyof MarketingConfigInput, string> = {
  logoUrl: 'logo_url',
  logoHeight: 'logo_height',
  faviconUrl: 'favicon_url',
  siteName: 'site_name',
  tagline: 'tagline',
  contactEmail: 'contact_email',
  kakaoUrl: 'kakao_url',
  ogImageUrl: 'og_image_url',
  seoTitle: 'seo_title',
  seoDescription: 'seo_description',
  headerPaddingY: 'header_padding_y',
  footerPaddingY: 'footer_padding_y',
  heroSlides: 'hero_slides',
  baseFontPx: 'base_font_px',
  heroMobileRatio: 'hero_mobile_ratio',
};

// Columns stored as JSONB — need ::jsonb cast + JSON.stringify on write.
const JSONB_KEYS = new Set<keyof MarketingConfigInput>(['heroSlides']);

type Row = {
  logo_url: string | null; logo_height: number | null; favicon_url: string | null;
  site_name: string | null; tagline: string | null; contact_email: string | null; kakao_url: string | null;
  og_image_url: string | null; seo_title: string | null; seo_description: string | null;
  header_padding_y: number | null; footer_padding_y: number | null;
  hero_slides: unknown; base_font_px: number | null; hero_mobile_ratio: string | null;
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
    ogImageUrl: row?.og_image_url ?? null,
    seoTitle: row?.seo_title ?? null,
    seoDescription: row?.seo_description ?? null,
    headerPaddingY: row?.header_padding_y ?? null,
    footerPaddingY: row?.footer_padding_y ?? null,
    heroSlides: (row?.hero_slides as HeroSlide[] | null) ?? [],
    baseFontPx: row?.base_font_px ?? null,
    heroMobileRatio: row?.hero_mobile_ratio ?? '4:5',
  };
}

export async function getMarketingConfig(): Promise<Row | null> {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT logo_url, logo_height, favicon_url, site_name, tagline, contact_email, kakao_url,
            og_image_url, seo_title, seo_description, header_padding_y, footer_padding_y,
            hero_slides, base_font_px, hero_mobile_ratio
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
      if (JSONB_KEYS.has(key as keyof MarketingConfigInput)) {
        set.push(`"${col}" = $${i++}::jsonb`);
        vals.push(JSON.stringify(v ?? []));
      } else {
        set.push(`"${col}" = $${i++}`);
        vals.push(v ?? null);
      }
    }
  }
  if (set.length > 0) {
    set.push('updated_at = NOW()');
    await prisma.$executeRawUnsafe(`UPDATE public.marketing_config SET ${set.join(', ')} WHERE id = 1`, ...vals);
  }
  return getMarketingConfig();
}
