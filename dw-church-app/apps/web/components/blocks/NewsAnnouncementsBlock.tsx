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
  const bulletinLimit = (props.bulletinLimit as number) ?? 3;
  const newsLimit = (props.newsLimit as number) ?? 4;
  const boardSlug = (props.boardSlug as string) || '';
  const moreUrl = (props.moreUrl as string) || '/bulletins';
  const bulletinBadge = (props.bulletinBadge as string) || '주보';
  // 버튼은 원하는 만큼 추가하는 배열([{text,url}]) — 인스펙터 ButtonsField 로 편집.
  const buttons = ((Array.isArray(props.buttons) ? props.buttons : []) as ActionButton[])
    .filter((b) => (b.text ?? b.label ?? '').trim());

  const rows: Row[] = [];

  // 주보 — 주보 콘텐츠 모듈에서.
  try {
    const res = await getBulletins(slug, { perPage: bulletinLimit });
    const items = Array.isArray(res) ? res : (res?.data ?? []);
    for (const b of items as any[]) {
      rows.push({ badge: bulletinBadge, title: b.title, href: `/bulletins/${b.id}`, date: fmtDate(b.bulletinDate ?? b.date) });
    }
  } catch { /* leave */ }

  // 광고 — 교회소식 게시판(카테고리 배지)에서.
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

  if (rows.length === 0 && buttons.length === 0) return null;

  const card = (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading sm:text-xl" style={getElementStyle(props, 'title')}>{title}</h2>
            <Link href={moreUrl} className="text-sm text-gray-400 transition-colors hover:text-[var(--dw-primary)]">더보기</Link>
          </div>

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
