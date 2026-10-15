import {
  getPages, getSermons, getBulletins, getColumns, getEvents,
  getAlbums, getStaff, getSermonNotes, getOnlineBulletins,
} from '@/lib/api';
import { getCanonicalOrigin } from '@/lib/tenant-site';

/**
 * 테넌트별 sitemap.xml.
 *
 * 교회 도메인에서 /sitemap.xml 로 열린다(미들웨어가 /tenant/<slug>/sitemap.xml 로 rewrite).
 * 운영자가 만든 페이지 + 각 콘텐츠 모듈의 상세 페이지를 전부 싣는다 —
 * 설교/주보/칼럼은 내부 링크가 목록 페이지 한 단계뿐이라 사이트맵이 없으면
 * 오래된 글이 사실상 색인되지 않는다.
 *
 * 한 모듈이 실패해도 사이트맵 전체가 죽지 않도록 전부 개별 catch 한다.
 */
export const revalidate = 3600;

// 서버의 perPage 상한은 100 (초과하면 400 VALIDATION_ERROR) — 실측 확인.
// 그래서 100개씩 최대 MAX_PAGES 번 긁어 모은다.
const PAGE_SIZE = 100;
const MAX_PAGES = 5; // 모듈당 최대 500건 — 사이트맵이 무한정 커지지 않게

interface Entry { loc: string; lastmod?: string; priority?: string }

function iso(v: unknown): string | undefined {
  const d = new Date(String(v ?? ''));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** 목록 API 는 배열이거나 {data:[...]} 봉투라 양쪽을 받는다. */
function rows(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as Record<string, unknown>[]) : [];
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const origin = await getCanonicalOrigin(slug);
  const entries: Entry[] = [{ loc: `${origin}/`, priority: '1.0' }];

  // 1) 운영자가 만든 페이지
  const pages = rows(await safe(() => getPages(slug)));
  for (const p of pages) {
    const s = String(p.slug ?? '').trim();
    if (!s || s === 'home') continue;
    entries.push({ loc: `${origin}/${s}`, lastmod: iso(p.updatedAt ?? p.updated_at), priority: '0.8' });
  }

  // 2) 콘텐츠 모듈 상세 — [경로, 페이지별 fetch, 날짜 필드] 로 한 번에 처리
  type Paged = (page: number) => Promise<unknown>;
  const modules: [string, Paged, string[]][] = [
    ['sermons', (p) => getSermons(slug, { page: p, perPage: PAGE_SIZE }), ['sermonDate', 'sermon_date', 'updatedAt']],
    ['bulletins', (p) => getBulletins(slug, { page: p, perPage: PAGE_SIZE }), ['bulletinDate', 'bulletin_date', 'updatedAt']],
    ['columns', (p) => getColumns(slug, { page: p, perPage: PAGE_SIZE }), ['createdAt', 'created_at']],
    ['events', (p) => getEvents(slug, { page: p, perPage: PAGE_SIZE }), ['startDate', 'start_date', 'updatedAt']],
    ['albums', (p) => getAlbums(slug, { page: p, perPage: PAGE_SIZE }), ['albumDate', 'album_date', 'updatedAt']],
    ['staff', () => getStaff(slug), ['updatedAt', 'updated_at']],
    ['sermon-note', (p) => getSermonNotes(slug, { page: p, perPage: PAGE_SIZE }), ['noteDate', 'note_date', 'updatedAt']],
    ['online-bulletins', (p) => getOnlineBulletins(slug, { page: p, perPage: PAGE_SIZE }), ['serviceDate', 'service_date', 'updatedAt']],
  ];

  for (const [path, fetcher, dateKeys] of modules) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const list = rows(await safe(() => fetcher(page)));
      for (const it of list) {
        const id = String(it.id ?? '').trim();
        if (!id) continue;
        const lastmod = dateKeys.map((k) => iso(it[k])).find(Boolean);
        entries.push({ loc: `${origin}/${path}/${id}`, lastmod, priority: '0.6' });
      }
      // 마지막 페이지(한 페이지를 못 채움)면 더 조회하지 않는다.
      if (list.length < PAGE_SIZE) break;
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>
    <loc>${xmlEscape(e.loc)}</loc>${e.lastmod ? `
    <lastmod>${e.lastmod}</lastmod>` : ''}${e.priority ? `
    <priority>${e.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
