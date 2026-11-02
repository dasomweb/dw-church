'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { koText } from '@dw-church/blocks';

/**
 * latest_feed 의 표시부 — 카테고리 탭 + 카드 그리드.
 *
 * 데이터 fetch 는 서버(LatestFeedBlock)가 하고, 여기서는 탭 상태만 들고 걸러
 * 보여준다. 탭을 서버 쿼리로 돌리면 홈에서 클릭마다 라운드트립이 생기므로
 * 가져온 항목 안에서만 필터한다.
 */
export interface FeedItem {
  id: string;
  /**
   * 소스 키 — 모듈 키(`column`) 또는 모듈@카테고리(`column@시니어`).
   * 피드 탭을 가르는 단위다(모듈이 아니라 소스 한 줄 기준).
   */
  kind: string;
  /** 탭·메타에 표시할 라벨 (운영자가 모듈별로 바꿀 수 있다) */
  kindLabel: string;
  title: string;
  sub?: string;
  /** yyyy-mm-dd */
  date?: string;
  image?: string;
  href?: string;
}

const INK = 'var(--dw-text, #1a1a1a)';
const OLIVE = 'var(--dw-secondary, #5e6044)';
const MUTED = 'var(--brand-muted, #8a857b)';
const RULE = 'var(--border, #e8e4dc)';
const IMG_BG = 'var(--dw-surface, #efece6)';
const SERIF = { fontFamily: 'var(--dw-font-heading, inherit)' } as const;

/** `2026-10-25` → `10. 25.` — 피드 메타는 연도를 빼고 짧게 읽는다. */
function shortDate(iso?: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  return `${Number(m[2])}. ${Number(m[3])}.`;
}

interface Props {
  items: FeedItem[];
  title: string;
  showTabs: boolean;
  allLabel: string;
  columns: 2 | 3 | 4;
  moreLabel?: string;
  moreUrl?: string;
  /**
   * 사이드 레일(variant `rail-left` / `rail-right`). 서버에서 그려 넘긴다 —
   * 레일 내용은 상태가 없고 최신 글 날짜를 서버에서 채워야 하기 때문이다.
   * 없으면 레일 칼럼 자체를 만들지 않는다(기존 전폭 레이아웃 그대로).
   */
  rail?: ReactNode;
  railSide?: 'left' | 'right';
}

export function LatestFeedClient({ items, title, showTabs, allLabel, columns, moreLabel, moreUrl, rail, railSide = 'left' }: Props) {
  // 탭은 실제로 들어온 항목에서만 만든다 — 등록 안 한 모듈 탭을 눌러 빈 화면이
  // 나오면 사이트가 고장난 것처럼 보인다.
  const tabs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of items) if (!seen.has(it.kind)) seen.set(it.kind, it.kindLabel);
    return [...seen.entries()].map(([kind, label]) => ({ kind, label }));
  }, [items]);

  const [active, setActive] = useState('');
  const shown = active ? items.filter((it) => it.kind === active) : items;

  const gridClass = columns === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : columns === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-2 lg:grid-cols-4';

  const body = (
    <>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between',
          gap: '12px 24px', borderBottom: `2px solid ${INK}`, paddingBottom: 14,
        }}
      >
        <h2 style={{ ...SERIF, margin: 0, ...koText('sectionTitle'), color: INK }}>{title}</h2>
        {showTabs && tabs.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {[{ kind: '', label: allLabel }, ...tabs].map((t) => (
              <button
                key={t.kind || '__all__'}
                type="button"
                onClick={() => setActive(t.kind)}
                style={{
                  background: 'none', border: 0, padding: 0, cursor: 'pointer',
                  ...koText('tab', { fontWeight: active === t.kind ? 700 : 500 }),
                  color: active === t.kind ? INK : MUTED,
                }}
                aria-pressed={active === t.kind}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`grid ${gridClass} gap-x-6 gap-y-9`} style={{ marginTop: 28 }}>
        {shown.map((it) => {
          const inner = (
            <>
              <div style={{ position: 'relative', aspectRatio: '4 / 3', background: IMG_BG, overflow: 'hidden' }}>
                {it.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.image}
                    alt={it.title}
                    loading="lazy"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <p style={{ margin: '12px 0 0', ...koText('eyebrow'), color: OLIVE }}>
                {[it.kindLabel, shortDate(it.date)].filter(Boolean).join(' · ')}
              </p>
              <h3 style={{ ...SERIF, margin: '6px 0 0', ...koText('cardTitle'), color: INK }}>
                {it.title}
              </h3>
              {it.sub && (
                <p style={{
                  margin: '6px 0 0', ...koText('summary'), color: MUTED,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {it.sub}
                </p>
              )}
            </>
          );
          // 상세 페이지가 없는 모듈(책 추천 등)은 링크를 걸지 않는다 — 눌러도 아무
          // 일이 없는 카드보다 안 눌리는 카드가 낫다.
          return it.href
            ? <Link key={`${it.kind}:${it.id}`} href={it.href} style={{ minWidth: 0, color: 'inherit', textDecoration: 'none' }}>{inner}</Link>
            : <article key={`${it.kind}:${it.id}`} style={{ minWidth: 0 }}>{inner}</article>;
        })}
      </div>

      {moreLabel && moreUrl && (
        <p style={{ margin: '28px 0 0', ...koText('tab'), borderTop: `1px solid ${RULE}`, paddingTop: 18 }}>
          <Link href={moreUrl} style={{ color: OLIVE, textDecoration: 'none' }}>{moreLabel} ›</Link>
        </p>
      )}
    </>
  );

  if (!rail) return body;

  // 레일 + 본문 2칼럼. 모바일에서는 한 줄로 쌓되 **본문이 먼저** 오게 한다 —
  // 레일은 보조 안내라, 폰에서 카드보다 위에 오면 첫 화면이 안내문으로 찬다.
  // 좌측 레일은 DOM 순서가 [레일, 본문] 이므로 flex-col-reverse 로 뒤집고,
  // 우측 레일은 그대로 쌓으면 된다. sticky 는 items-start 가 있어야 동작한다.
  const stack = railSide === 'left' ? 'flex-col-reverse' : 'flex-col';
  const main = <div className="min-w-0 flex-1">{body}</div>;

  return (
    <div className={`flex ${stack} gap-10 lg:flex-row lg:items-start lg:gap-12`}>
      {railSide === 'left' ? <>{rail}{main}</> : <>{main}{rail}</>}
    </div>
  );
}
