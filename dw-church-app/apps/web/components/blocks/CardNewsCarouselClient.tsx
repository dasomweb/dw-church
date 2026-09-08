'use client';
import { useState } from 'react';
import Link from 'next/link';

// 카드뉴스 캐러셀 — 한 장씩 넘겨 보는 뷰(화살표·점·스와이프). 교회 톤의 차분한
// 배경 위에 흰 카드. 카드 1장이면 컨트롤 숨김.
interface Card { title?: string; category?: string; description?: string; caption?: string; imageUrl?: string; linkUrl?: string; href?: string }

const BRAND = 'var(--dw-primary, #1466d6)';
const MUTED = 'var(--dw-text-muted, #61697a)';
const BORDER = 'var(--dw-border, #e5e7eb)';

export function CardNewsCarouselClient({ cards }: { cards: Card[] }) {
  const n = cards.length;
  const [i, setI] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  if (!n) return null;
  const idx = ((i % n) + n) % n;
  const c = cards[idx];
  if (!c) return null;
  const go = (d: number) => setI((p) => p + d);
  const href = c.linkUrl || c.href || '';
  const desc = c.description || c.caption || '';

  const media = (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
      {c.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.imageUrl} alt={c.title ?? ''} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-4xl text-white/90" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #1466d6), var(--dw-secondary, #64748b))' }}>🗞️</div>
      )}
      {c.category && (
        <span className="absolute left-3 top-3 inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-semibold shadow-sm" style={{ background: 'rgba(255,255,255,.92)', color: BRAND }}>{c.category}</span>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-md">
      <div
        className="relative"
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const endX = e.changedTouches[0]?.clientX ?? touchX;
          const dx = endX - touchX;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        {href ? <Link href={href} className="block">{media}</Link> : media}

        {n > 1 && (
          <>
            <button
              type="button" aria-label="이전"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition hover:scale-105"
              style={{ background: 'rgba(255,255,255,.92)', color: 'var(--dw-text, #16181d)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              type="button" aria-label="다음"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition hover:scale-105"
              style={{ background: 'rgba(255,255,255,.92)', color: 'var(--dw-text, #16181d)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </>
        )}
      </div>

      {(c.title || desc) && (
        <div className="mt-4 text-center">
          {c.title && <div className="text-[16px] font-semibold">{c.title}</div>}
          {desc && <div className="mt-1 text-[13.5px] leading-[1.6]" style={{ color: MUTED }}>{desc}</div>}
        </div>
      )}

      {n > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {cards.map((_, k) => (
            <button
              key={k} type="button" aria-label={`${k + 1}번째`}
              onClick={() => setI(k)}
              className="h-2 rounded-full transition-all"
              style={k === idx
                ? { width: 20, background: BRAND }
                : { width: 8, background: BORDER }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
