'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CardNewsViewer, type Deck } from './CardNewsViewer';

/**
 * 카드뉴스 덱 목록(클라이언트). 기본은 **캐러셀**(한 번에 한 장씩 넘겨 봄 — 대표님:
 * "여러 장 펼치지 말고 캐러셀로 넘기면서"). 표지(4:5)를 누르면 CardNewsViewer(몰입형
 * 뷰어)로 그 덱의 카드들을 넘겨 본다. 그리드/가로 레일 variant 도 선택 가능.
 * 교회 톤(밝은 배경). 카테고리 칩으로 거른다.
 */
export interface DeckItem extends Deck {
  cover?: string; linkUrl?: string;
}

const BRAND = 'var(--dw-primary, #1466d6)';
const INK = 'var(--dw-text, #16181d)';
const MUTED = 'var(--dw-text-muted, #61697a)';
const BORDER = 'var(--dw-border, #e5e7eb)';

export function CardNewsDecksClient({ decks, variant = 'carousel' }: { decks: DeckItem[]; variant?: 'carousel' | 'grid' | 'rail' }) {
  const router = useRouter();
  const [active, setActive] = useState<string>('전체');
  const [open, setOpen] = useState<DeckItem | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const d of decks) if (d.category) set.add(d.category);
    return Array.from(set);
  }, [decks]);

  const shown = active === '전체' ? decks : decks.filter((d) => d.category === active);

  const openDeck = (d: DeckItem) => {
    if (d.cards && d.cards.length) setOpen(d);
    else if (d.linkUrl) router.push(d.linkUrl);
  };

  const Cover = ({ d, className }: { d: DeckItem; className?: string }) => (
    <button
      type="button" onClick={() => openDeck(d)}
      className={`group flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${className ?? ''}`}
      style={{ '--tw-ring-color': BORDER } as React.CSSProperties}
    >
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4 / 5' }}>
        {d.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.cover} alt={d.title ?? ''} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-white/90" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #1466d6), var(--dw-secondary, #64748b))' }}>🗞️</div>
        )}
        {d.category && (
          <span className="absolute left-2.5 top-2.5 inline-flex h-[24px] items-center rounded-full px-2.5 text-[11.5px] font-semibold shadow-sm" style={{ background: 'rgba(255,255,255,.94)', color: BRAND }}>{d.category}</span>
        )}
        {d.cards && d.cards.length > 1 && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm" style={{ background: 'rgba(255,255,255,.94)', color: INK }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="5" width="14" height="16" rx="2" /><path d="M21 7v12a2 2 0 0 1-2 2" /></svg>
            {d.cards.length}
          </span>
        )}
      </div>
      {(d.title || d.description) && (
        <div className="px-3 py-3">
          {d.title && <div className="line-clamp-2 text-[14.5px] font-semibold leading-snug" style={{ color: INK }}>{d.title}</div>}
          {d.description && <div className="mt-1 line-clamp-2 text-[12.5px] leading-[1.5]" style={{ color: MUTED }}>{d.description}</div>}
        </div>
      )}
    </button>
  );

  return (
    <div>
      {/* 카테고리 칩 필터 */}
      {categories.length > 0 && (
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {['전체', ...categories].map((cat) => {
            const on = active === cat;
            return (
              <button
                key={cat} type="button" onClick={() => setActive(cat)}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition"
                style={on
                  ? { background: BRAND, color: '#fff' }
                  : { background: '#fff', color: MUTED, boxShadow: `inset 0 0 0 1px ${BORDER}` }}
              >{cat}</button>
            );
          })}
        </div>
      )}

      {variant === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((d) => <Cover key={d.id} d={d} />)}
        </div>
      ) : variant === 'rail' ? (
        // 홈 가로 레일 — 스냅 스크롤(레퍼런스의 CardNewsRail)
        <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2" style={{ scrollbarWidth: 'thin' }}>
          {shown.map((d) => (
            <div key={d.id} className="w-[210px] shrink-0 snap-start sm:w-[236px]"><Cover d={d} /></div>
          ))}
        </div>
      ) : (
        <Carousel decks={shown} render={(d) => <Cover d={d} />} />
      )}

      {open && <CardNewsViewer deck={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// 한 장씩 넘겨 보는 캐러셀(화살표·점·스와이프). 표지는 render 로 그린다.
function Carousel({ decks, render }: { decks: DeckItem[]; render: (d: DeckItem) => React.ReactNode }) {
  const n = decks.length;
  const [i, setI] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  if (!n) return null;
  const idx = ((i % n) + n) % n;
  const d = decks[idx];
  if (!d) return null;
  const go = (delta: number) => setI((p) => p + delta);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        className="relative"
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        {render(d)}
        {n > 1 && (
          <>
            <button type="button" aria-label="이전" onClick={() => go(-1)}
              className="absolute left-2 top-[38%] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition hover:scale-105"
              style={{ background: 'rgba(255,255,255,.94)', color: 'var(--dw-text, #16181d)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" aria-label="다음" onClick={() => go(1)}
              className="absolute right-2 top-[38%] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition hover:scale-105"
              style={{ background: 'rgba(255,255,255,.94)', color: 'var(--dw-text, #16181d)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {decks.map((_, k) => (
            <button key={k} type="button" aria-label={`${k + 1}번째`} onClick={() => setI(k)}
              className="h-2 rounded-full transition-all"
              style={k === idx ? { width: 20, background: BRAND } : { width: 8, background: BORDER }} />
          ))}
        </div>
      )}
    </div>
  );
}
