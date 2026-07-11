'use client';

import { useEffect, useState } from 'react';

/**
 * Client half of the video board. Renders the thumbnail cards (just the YouTube
 * poster image, sermon-card style) and, on click, opens a modal lightbox that
 * plays the video with an embedded YouTube player — videos never play inline in
 * the page grid, only in the popup.
 */

export interface VideoItem {
  id: string;
  title: string;
  youtubeUrl: string;
  date: string;
  categoryName: string;
}

function extractYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?\s/]+)/);
  return match?.[1] ?? null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function VideoBoardClient({ videos, gridClass }: { videos: VideoItem[]; gridClass: string }) {
  const [active, setActive] = useState<VideoItem | null>(null);
  const activeId = active ? extractYoutubeId(active.youtubeUrl) : null;

  // Esc to close + lock body scroll while the modal is open.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  return (
    <>
      <div className={`grid ${gridClass} gap-8`}>
        {videos.map((v) => {
          const vid = extractYoutubeId(v.youtubeUrl);
          const poster = vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : '';
          return (
            <div key={v.id} className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setActive(v)}
                aria-label={`${v.title} 재생`}
                className="group relative block w-full overflow-hidden"
                style={{ paddingBottom: '56.25%' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt={v.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {/* Resting state = just the thumbnail; a play hint fades in on hover. */}
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55">
                    <svg className="h-6 w-6 translate-x-[1px] text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </span>
              </button>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold font-heading text-base leading-snug line-clamp-2">{v.title}</h3>
                <div className="mt-3 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs text-gray-400">
                  {v.date ? <span>{formatDate(v.date)}</span> : <span />}
                  {v.categoryName && <span className="text-[var(--dw-primary)]">{v.categoryName}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {active && activeId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActive(null)}
              aria-label="닫기"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${activeId}?autoplay=1&rel=0`}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {active.title && <p className="mt-3 text-center text-sm text-white/90">{active.title}</p>}
          </div>
        </div>
      )}
    </>
  );
}
