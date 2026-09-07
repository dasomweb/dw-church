import Link from 'next/link';
import { getBulletins, getBoardBySlug, getBoardPosts } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';

interface NewsAnnouncementsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface Row {
  badge: string;
  title: string;
  href?: string;
  date?: string;
}

interface ActionButton { text?: string; label?: string; url: string }

function fmtDate(raw: unknown): string {
  if (!raw) return '';
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 날짜값 → 'YYYY-MM-DD'(날짜만). 파싱 불가 시 ''. */
function dateISO(raw: unknown): string {
  if (!raw) return '';
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** 다가오는 주일(오늘이 주일이면 오늘) 의 'YYYY-MM-DD'. */
function upcomingSundayISO(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7)); // 0=주일 → 오늘, 그 외 → 다음 주일
  return d.toISOString().slice(0, 10);
}

/**
 * 주보 1개 선택 — "다가오는 주일 기준 가장 최근" (대표님 2026-09-06).
 * 다가오는 주일(cutoff) 이하 날짜 중 가장 최신을 고른다. 주일 전이라도 다가오는
 * 주일 주보가 업로드됐으면(날짜 == 다가오는 주일 ≤ cutoff) 그게 선택된다.
 * cutoff 이하가 하나도 없으면(모두 그 이후) 가장 이른 것으로 폴백.
 */
function pickWeeklyBulletin<T extends Record<string, unknown>>(items: T[]): T | null {
  const cutoff = upcomingSundayISO();
  const dated = items
    .map((b) => ({ b, iso: dateISO((b as any).bulletinDate ?? (b as any).date) }))
    .filter((x) => x.iso);
  if (dated.length === 0) return items[0] ?? null;
  const le = dated.filter((x) => x.iso <= cutoff).sort((a, b) => (a.iso < b.iso ? 1 : -1));
  if (le.length) return le[0]!.b;
  const asc = dated.slice().sort((a, b) => (a.iso < b.iso ? -1 : 1));
  return asc[0]!.b;
}

/**
 * 주보 · 광고 (news_announcements) — Data Block.
 *
 * 주보(badge '주보')는 주보 콘텐츠 모듈에서, 광고는 교회소식 게시판(props.boardSlug)의
 * 글에서 가져와 카테고리(친교/교육/구역 …)를 배지로 붙여 한 목록에 섞어 표시한다.
 * 하단 액션 버튼(기도 요청 / 심방 신청 등)은 Contact 폼으로 연결(props.buttons).
 * 내용이 전혀 없으면 렌더하지 않는다.
 */
export async function NewsAnnouncementsBlock({ props, slug }: NewsAnnouncementsBlockProps) {
  const title = (props.title as string) || '주보 · 광고';
  const newsLimit = (props.newsLimit as number) ?? 4;
  const boardSlug = (props.boardSlug as string) || '';
  const moreUrl = (props.moreUrl as string) || '/bulletins';
  const bulletinBadge = (props.bulletinBadge as string) || '주보';
  // 버튼은 원하는 만큼 추가하는 배열([{text,url}]) — 인스펙터 ButtonsField 로 편집.
  const buttons = ((Array.isArray(props.buttons) ? props.buttons : []) as ActionButton[])
    .filter((b) => (b.text ?? b.label ?? '').trim());

  // 주보 — 매주 1개만: "다가오는 주일 기준 가장 최근"(대표님 2026-09-06). 후보를
  // 넉넉히 받아 규칙으로 1개 선택(서버는 bulletin_date DESC 정렬).
  let bulletin: { id?: string; title?: string; date?: string } | null = null;
  try {
    const res = await getBulletins(slug, { perPage: 8 });
    const items = (Array.isArray(res) ? res : (res?.data ?? [])) as Record<string, unknown>[];
    const b = pickWeeklyBulletin(items);
    if (b) bulletin = { id: b.id as string, title: b.title as string, date: fmtDate((b as any).bulletinDate ?? (b as any).date) };
  } catch { /* leave */ }

  // 광고 — 교회소식 게시판(카테고리 배지)에서.
  const rows: Row[] = [];
  if (boardSlug) {
    try {
      const board = await getBoardBySlug(slug, boardSlug);
      if (board?.id) {
        const res = await getBoardPosts(slug, board.id, { perPage: newsLimit });
        const posts = Array.isArray(res) ? res : (res?.data ?? []);
        for (const p of posts as any[]) {
          rows.push({ badge: (p.category as string) || '소식', title: p.title, date: fmtDate(p.createdAt ?? p.created_at) });
        }
      }
    } catch { /* leave */ }
  }

  if (!bulletin && rows.length === 0 && buttons.length === 0) return null;

  const card = (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading sm:text-xl" style={getElementStyle(props, 'title')}>{title}</h2>
            <Link href={moreUrl} className="text-sm text-gray-400 transition-colors hover:text-[var(--dw-primary)]">더보기</Link>
          </div>

          {/* 주보 — 매주 1개, 최상단에 구별되게(브랜드 틴트 카드 + PDF 아이콘) */}
          {bulletin && (
            <Link
              href={bulletin.id ? `/bulletins/${bulletin.id}` : moreUrl}
              className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--dw-primary,#2563eb)]/25 bg-[var(--dw-primary,#2563eb)]/[0.06] p-4 transition-colors hover:bg-[var(--dw-primary,#2563eb)]/10"
            >
              <span className="inline-flex shrink-0 items-center rounded-md bg-[var(--dw-primary,#2563eb)] px-2.5 py-1 text-xs font-bold text-white">{bulletinBadge}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-gray-900">{bulletin.title}</span>
                {bulletin.date && <span className="mt-0.5 block text-xs text-gray-500">{bulletin.date}</span>}
              </span>
              <svg className="h-5 w-5 shrink-0 text-[var(--dw-primary,#2563eb)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
            </Link>
          )}

          {rows.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {rows.map((r, i) => {
                const inner = (
                  <span className="flex items-center gap-3 py-3">
                    <span className="inline-flex shrink-0 items-center rounded-md bg-[var(--dw-primary,#2563eb)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--dw-primary,#2563eb)]">
                      {r.badge}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{r.title}</span>
                    {r.date && <span className="shrink-0 text-xs text-gray-400">{r.date}</span>}
                  </span>
                );
                return (
                  <li key={i}>
                    {r.href ? (
                      <Link href={r.href} className="block transition-colors hover:text-[var(--dw-primary)]">{inner}</Link>
                    ) : inner}
                  </li>
                );
              })}
            </ul>
          )}

          {buttons.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {buttons.map((b, i) => (
                <Link
                  key={i}
                  href={b.url || '/contact'}
                  className={i === 0
                    ? 'inline-flex items-center rounded-full bg-[var(--dw-primary,#2563eb)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90'
                    : 'inline-flex items-center rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50'}
                >
                  {b.text ?? b.label}
                </Link>
              ))}
            </div>
          )}
        </div>
  );

  // 레이아웃 컬럼 안에서는 섹션 크롬 없이 카드만(맨 카드 2단).
  if (props._inLayout) return card;
  return (
    <DataSection props={props} defaultBg="var(--dw-surface)">
      <div className="mx-auto max-w-7xl">{card}</div>
    </DataSection>
  );
}
