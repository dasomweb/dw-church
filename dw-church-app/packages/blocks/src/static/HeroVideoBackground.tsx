'use client';

import { useEffect, useRef } from 'react';

/**
 * Ambient YouTube background — the simple, standard plain-<iframe>
 * approach (no IFrame Player API, no state machine).
 *
 * The earlier API-based implementation kept regressing (center button,
 * extreme zoom, 4s delay). This is the well-known background-video
 * recipe:
 *   - URL params: controls=0 (hide control bar) + autoplay=1 + mute=1
 *     (mute is REQUIRED for autoplay) + loop=1&playlist=<id> (YT needs
 *     playlist=self to loop) + rel=0 + modestbranding=1 + playsinline=1
 *   - pointer-events:none on the wrapper (CSS) so a click can't pause
 *     the video and pop the big center button
 *
 * The classic CSS cover uses vw/vh, which only works for a full-
 * viewport background. The hero is a sized box, so a tiny
 * ResizeObserver sizes the (fixed 16:9) iframe to exactly cover the
 * box, centred — no letterbox, no over-zoom, no transforms.
 *
 * `posterUrl` is painted as the wrapper background so the still image
 * shows until the iframe starts rendering frames over it — a free
 * image→video transition with zero JS.
 */
export function HeroVideoBackground({
  videoId,
  rounded,
  posterUrl,
}: {
  videoId: string;
  rounded?: boolean;
  posterUrl?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const frame = frameRef.current;
    if (!wrap || !frame) return;

    let raf = 0;
    let lastW = -1;
    let lastH = -1;

    const fit = () => {
      raf = 0;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      // Exact 16:9 cover — only the unavoidable overflow is clipped.
      const scale = Math.max(w / 16, h / 9);
      const fw = Math.ceil(16 * scale);
      const fh = Math.ceil(9 * scale);
      if (fw === lastW && fh === lastH) return;
      lastW = fw;
      lastH = fh;
      frame.style.width = `${fw}px`;
      frame.style.height = `${fh}px`;
      frame.style.left = `${Math.round((w - fw) / 2)}px`;
      frame.style.top = `${Math.round((h - fh) / 2)}px`;
    };

    fit();
    const ro = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(fit);
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [videoId]);

  const src =
    `https://www.youtube-nocookie.com/embed/${videoId}?` +
    `controls=0&autoplay=1&mute=1&loop=1&playlist=${videoId}` +
    `&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`;

  return (
    <div
      ref={wrapRef}
      data-element="backgroundVideoUrl"
      className={`b2b-hero-video ${rounded ? 'rounded-3xl' : ''}`}
      style={
        posterUrl
          ? {
              backgroundImage: `url("${posterUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <iframe
        ref={frameRef}
        src={src}
        title=""
        aria-hidden="true"
        tabIndex={-1}
        allow="autoplay; encrypted-media; picture-in-picture"
        style={{ position: 'absolute', border: 0 }}
      />
    </div>
  );
}
