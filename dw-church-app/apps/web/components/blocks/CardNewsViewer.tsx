'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 카드뉴스 뷰어 — Atlanta Koreatown 카드뉴스 레퍼런스의 "보여지는 기능"을 교회 톤으로.
 * 한 덱(여러 4:5 이미지 카드)을 몰입형으로 넘겨 본다: 진행 막대·키보드(←→·Esc)·
 * 스와이프(40px)·썸네일 스트립·카드별 캡션 패널·공유(navigator.share→클립보드)·
 * 전 카드 미리 로드. ⚠교회 사이트라 다크/블랙 배경 금지 — 밝은 '종이' 톤 스크림.
 */
export interface DeckCard { imageUrl: string; caption?: string }
export interface Deck {
  id: string; title?: string; category?: string | null; description?: string | null; cards: DeckCard[];
}

const BRAND = 'var(--dw-primary, #1466d6)';
const INK = 'var(--dw-text, #16181d)';
const MUTED = 'var(--dw-text-muted, #61697a)';

export function CardNewsViewer({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const cards = deck.cards ?? [];
  const n = cards.length;
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const idx = n ? ((i % n) + n) % n : 0;
  const card = cards[idx];

  const go = useCallback((d: number) => setI((p) => p + d), []);

  // 키보드: ←/→ 이동, Esc 닫기. + 본문 스크롤 잠금.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [go, onClose]);

  // 전 카드 미리 로드(넘길 때 깜빡임 방지).
  useEffect(() => {
    cards.forEach((c) => { if (c.imageUrl) { const im = new Image(); im.src = c.imageUrl; } });
  }, [cards]);

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = deck.title || '카드뉴스';
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      alert('링크를 복사했습니다.');
    } catch { /* 사용자가 공유 취소 — 무시 */ }
  };

  if (!card) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label={deck.title || '카드뉴스'}
      className="fixed inset-0 z-[70] flex flex-col items-center overflow-y-auto px-4 py-5 sm:py-8"
      style={{
        // 밝은 종이 톤 스크림(브랜드 살짝) — 다크 배경 금지
        background: 'color-mix(in srgb, var(--dw-primary, #1466d6) 6%, #ffffff)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md">
        {/* 상단: 제목 + 닫기 */}
        <div className="mb-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {deck.category && <div className="text-[12px] font-semibold" style={{ color: BRAND }}>{deck.category}</div>}
            {deck.title && <div className="truncate text-[16px] font-bold" style={{ color: INK }}>{deck.title}</div>}
          </div>
          <button
            type="button" aria-label="닫기" onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition hover:scale-105"
            style={{ background: '#fff', color: INK }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 진행 막대(카드 수만큼 세그먼트) */}
        {n > 1 && (
          <div className="mb-3 flex gap-1.5">
            {cards.map((_, k) => (
              <button
                key={k} type="button" aria-label={`${k + 1}번째 카드`} onClick={() => setI(k)}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ background: k <= idx ? BRAND : 'color-mix(in srgb, var(--dw-primary, #1466d6) 18%, #ffffff)' }}
              />
            ))}
          </div>
        )}

        {/* 4:5 카드 이미지 */}
        <div
          className="relative overflow-hidden rounded-2xl bg-white shadow-lg"
          style={{ aspectRatio: '4 / 5' }}
          onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imageUrl} alt={card.caption || deck.title || ''} className="h-full w-full object-cover" />
          {n > 1 && (
            <>
              <button type="button" aria-label="이전" onClick={() => go(-1)}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition hover:scale-105"
                style={{ background: 'rgba(255,255,255,.94)', color: INK }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button type="button" aria-label="다음" onClick={() => go(1)}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition hover:scale-105"
                style={{ background: 'rgba(255,255,255,.94)', color: INK }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </>
          )}
          {/* 페이지 표시 */}
          {n > 1 && (
            <span className="absolute bottom-2.5 right-3 rounded-full px-2.5 py-0.5 text-[12px] font-semibold shadow-sm"
              style={{ background: 'rgba(255,255,255,.92)', color: BRAND }}>{idx + 1} / {n}</span>
          )}
        </div>

        {/* 카드별 캡션 패널 */}
        {(card.caption || (idx === 0 && deck.description)) && (
          <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
            <p className="whitespace-pre-wrap text-[14.5px] leading-[1.75]" style={{ color: INK }}>
              {card.caption || deck.description}
            </p>
          </div>
        )}

        {/* 하단: 공유 + 썸네일 스트립 */}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={share}
            className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold shadow-sm transition hover:scale-[1.03]"
            style={{ background: '#fff', color: BRAND }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            공유
          </button>
          <span className="text-[12.5px]" style={{ color: MUTED }}>{n > 1 ? '좌우로 넘겨 보세요' : ''}</span>
        </div>

        {n > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {cards.map((c, k) => (
              <button
                key={k} type="button" aria-label={`${k + 1}번째로 이동`} onClick={() => setI(k)}
                className="relative shrink-0 overflow-hidden rounded-lg transition"
                style={{
                  width: 46, aspectRatio: '4 / 5',
                  outline: k === idx ? `2px solid ${BRAND}` : '1px solid color-mix(in srgb, var(--dw-primary, #1466d6) 18%, #ffffff)',
                  outlineOffset: k === idx ? 1 : 0, opacity: k === idx ? 1 : 0.72,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
