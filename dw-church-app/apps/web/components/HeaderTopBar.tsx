'use client';

import { useEffect, useState } from 'react';

/**
 * 상단 유틸리티 바 (한인 이민교회 헤더 상단 줄) — client component.
 * 좌측: 예배시간·주소 등 한 줄 안내 텍스트.
 * 우측: 글자 크기(가/가) 접근성 토글 + 카카오톡 채널 링크.
 *
 * 언어(한국어/ENGLISH) 토글은 번역 엔진과 함께 별도 단계에서 붙인다 — 지금은
 * 실제로 작동하지 않는 컨트롤을 내보내지 않기 위해 렌더하지 않는다.
 *
 * 글자 크기: document.documentElement 의 font-size 를 조절(rem 기반 텍스트 =
 * Tailwind text-* 유틸리티가 함께 커짐). localStorage 로 방문자별 기억.
 */

const FONT_KEY = 'tl-font-scale';
const SCALES = [1, 1.18] as const; // 기본 / 크게
const BASE_PX = 16;

interface HeaderTopBarProps {
  text: string;
  kakaoUrl?: string;
  showFontSize?: boolean;
  showKakao?: boolean;
  /** Dark header → light text/borders on the bar. */
  dark?: boolean;
}

export function HeaderTopBar({ text, kakaoUrl, showFontSize = true, showKakao = true, dark = false }: HeaderTopBarProps) {
  const [scale, setScale] = useState(1);

  // Restore the saved scale on mount and apply it.
  useEffect(() => {
    let saved = 1;
    try {
      const raw = localStorage.getItem(FONT_KEY);
      if (raw) saved = Number(raw) || 1;
    } catch { /* private mode / blocked storage */ }
    if (!SCALES.includes(saved as (typeof SCALES)[number])) saved = 1;
    setScale(saved);
    document.documentElement.style.fontSize = `${BASE_PX * saved}px`;
  }, []);

  const applyScale = (s: number) => {
    setScale(s);
    document.documentElement.style.fontSize = `${BASE_PX * s}px`;
    try { localStorage.setItem(FONT_KEY, String(s)); } catch { /* ignore */ }
  };

  const hasKakao = showKakao && !!kakaoUrl;
  if (!text && !showFontSize && !hasKakao) return null;

  const fg = dark ? 'rgba(255,255,255,0.85)' : 'var(--dw-text, #374151)';
  const faint = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)';
  const barBg = dark ? 'rgba(255,255,255,0.06)' : 'var(--dw-surface, #f8fafc)';

  return (
    <div style={{ backgroundColor: barBg, borderBottom: `1px solid ${faint}`, color: fg }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-xs sm:px-6">
        <p className="min-w-0 truncate">{text}</p>
        <div className="flex shrink-0 items-center gap-3">
          {showFontSize && (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline opacity-70">글자 크기</span>
              <div className="flex items-center overflow-hidden rounded-full" style={{ border: `1px solid ${faint}` }}>
                {SCALES.map((s, i) => {
                  const active = Math.abs(scale - s) < 0.001;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => applyScale(s)}
                      aria-label={i === 0 ? '기본 글자 크기' : '큰 글자 크기'}
                      aria-pressed={active}
                      className="px-2 py-0.5 leading-none transition-colors"
                      style={{
                        fontSize: i === 0 ? 12 : 15,
                        fontWeight: active ? 700 : 400,
                        backgroundColor: active ? (dark ? 'rgba(255,255,255,0.9)' : 'var(--dw-primary, #111827)') : 'transparent',
                        color: active ? (dark ? '#111827' : '#ffffff') : fg,
                      }}
                    >
                      가
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {hasKakao && (
            <>
              <span aria-hidden style={{ color: faint }}>|</span>
              <a href={kakaoUrl} target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-70">
                카카오톡 채널
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
