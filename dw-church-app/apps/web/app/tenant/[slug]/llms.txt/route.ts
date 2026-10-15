import { getChurchSettings, getPages, getSermonNotes, getLatestOnlineBulletin } from '@/lib/api';
import { getCanonicalOrigin } from '@/lib/tenant-site';

/**
 * 테넌트별 llms.txt (AEO/GEO).
 *
 * AI 답변엔진이 "○○교회 예배 시간 / 주소 / 최근 설교" 를 물었을 때 읽어갈
 * **사람이 쓴 요약 + 주요 링크** 를 한 파일로 제공한다. HTML 을 파싱해
 * 추측하게 두는 것보다 정확하다.
 *
 * 원칙: **없는 사실은 적지 않는다.** 주소·연락처를 등록 안 한 교회면 그 줄은
 * 통째로 빠진다(빈 값으로 "주소: " 를 내보내지 않는다).
 */
export const revalidate = 3600;

function rows(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as Record<string, unknown>[]) : [];
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

function val(s: Record<string, unknown> | null, camel: string, snake: string): string {
  return String(s?.[camel] ?? s?.[snake] ?? '').trim();
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const origin = await getCanonicalOrigin(slug);
  const settings = (await safe(() => getChurchSettings(slug))) as Record<string, unknown> | null;

  const name = val(settings, 'churchName', 'church_name') || slug;
  const desc = val(settings, 'seoDescription', 'seo_description');
  const address = val(settings, 'churchAddress', 'church_address');
  const phone = val(settings, 'churchPhone', 'church_phone');
  const email = val(settings, 'churchEmail', 'church_email');

  const out: string[] = [`# ${name}`, ''];
  if (desc) out.push(`> ${desc}`, '');

  const facts: string[] = [];
  if (address) facts.push(`- 주소: ${address}`);
  if (phone) facts.push(`- 전화: ${phone}`);
  if (email) facts.push(`- 이메일: ${email}`);
  facts.push(`- 홈페이지: ${origin}/`);
  out.push('## 교회 정보', ...facts, '');

  // 운영자가 만든 페이지 = 이 교회가 실제로 공개하는 메뉴
  const pages = rows(await safe(() => getPages(slug)))
    .filter((p) => String(p.slug ?? '').trim() && String(p.slug) !== 'home');
  if (pages.length > 0) {
    out.push('## 페이지');
    for (const p of pages.slice(0, 50)) {
      const title = String(p.title ?? p.slug ?? '').trim();
      out.push(`- [${title}](${origin}/${String(p.slug)})`);
    }
    out.push('');
  }

  // 최근 설교노트 — "이 교회가 무엇을 가르치는가" 에 가장 가까운 1차 자료
  const notes = rows(await safe(() => getSermonNotes(slug, { perPage: 10 })));
  if (notes.length > 0) {
    out.push('## 최근 설교');
    for (const n of notes.slice(0, 10)) {
      const t = String(n.title ?? '').trim();
      const d = String(n.noteDate ?? n.note_date ?? '').slice(0, 10);
      if (!t) continue;
      out.push(`- [${t}](${origin}/sermon-note/${String(n.id)})${d ? ` — ${d}` : ''}`);
    }
    out.push('');
  }

  const bulletin = await safe(() => getLatestOnlineBulletin(slug));
  if (bulletin && (bulletin as Record<string, unknown>).id) {
    out.push('## 온라인 주보', `- 최신 주보: ${origin}/onlinejubo`, '');
  }

  return new Response(out.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
