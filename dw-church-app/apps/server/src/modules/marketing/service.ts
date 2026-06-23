import { prisma } from '../../config/database.js';

/** Platform marketing config (singleton row id=1) — currently the KakaoTalk inquiry link. */
export async function getMarketingConfig(): Promise<{ kakao_url: string | null } | null> {
  const rows = await prisma.$queryRawUnsafe<{ kakao_url: string | null }[]>(
    `SELECT kakao_url FROM public.marketing_config WHERE id = 1`,
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

export async function setMarketingConfig(input: { kakaoUrl?: string | null }) {
  await prisma.$executeRawUnsafe(
    `UPDATE public.marketing_config SET kakao_url = $1, updated_at = NOW() WHERE id = 1`,
    input.kakaoUrl ?? null,
  );
  return getMarketingConfig();
}
