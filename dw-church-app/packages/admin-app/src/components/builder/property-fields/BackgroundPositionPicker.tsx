import { useRef, useState } from 'react';

/**
 * Visual background-image focal-point picker. Shows the actual background image
 * with a rule-of-thirds grid overlay; clicking (or dragging) on the image sets
 * the focal point to that exact x%/y% — stored as a CSS "x% y%" string that the
 * storefront feeds straight into object-position / background-position.
 *
 * Backward compatible: an existing 1-of-9 token value ('center', 'top-left', …)
 * is parsed to its percentage so the marker starts in the right place.
 */

const TOKEN_TO_PCT: Record<string, { x: number; y: number }> = {
  center: { x: 50, y: 50 },
  top: { x: 50, y: 0 },
  bottom: { x: 50, y: 100 },
  left: { x: 0, y: 50 },
  right: { x: 100, y: 50 },
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 100, y: 0 },
  'bottom-left': { x: 0, y: 100 },
  'bottom-right': { x: 100, y: 100 },
};

function parsePosition(value: string | undefined): { x: number; y: number } {
  if (!value) return { x: 50, y: 50 };
  if (value.includes('%')) {
    const m = value.match(/(-?\d+(?:\.\d+)?)\s*%\s+(-?\d+(?:\.\d+)?)\s*%/);
    if (m) return { x: clamp(Number(m[1])), y: clamp(Number(m[2])) };
  }
  return TOKEN_TO_PCT[value] ?? { x: 50, y: 50 };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function BackgroundPositionPicker({
  imageUrl,
  value,
  onChange,
}: {
  imageUrl: string;
  value: string | undefined;
  onChange: (pos: string) => void;
}) {
  const { x, y } = parsePosition(value);
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [ratio, setRatio] = useState<number>(16 / 9);

  const setFromEvent = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = clamp(((clientX - r.left) / r.width) * 100);
    const py = clamp(((clientY - r.top) / r.height) * 100);
    onChange(`${Math.round(px)}% ${Math.round(py)}%`);
  };

  return (
    <div className="space-y-1.5">
      <div
        ref={boxRef}
        role="slider"
        aria-label="배경 이미지 초점 위치"
        aria-valuetext={`${Math.round(x)}% ${Math.round(y)}%`}
        className="relative w-full select-none overflow-hidden rounded-lg border border-gray-300 cursor-crosshair bg-gray-100"
        style={{ aspectRatio: String(ratio) }}
        onMouseDown={(e) => { setDragging(true); setFromEvent(e.clientX, e.clientY); }}
        onMouseMove={(e) => { if (dragging) setFromEvent(e.clientX, e.clientY); }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const im = e.currentTarget;
            if (im.naturalWidth && im.naturalHeight) setRatio(im.naturalWidth / im.naturalHeight);
          }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* Rule-of-thirds grid */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-full w-px bg-white/50" />
          <div className="absolute left-2/3 top-0 h-full w-px bg-white/50" />
          <div className="absolute top-1/3 left-0 w-full h-px bg-white/50" />
          <div className="absolute top-2/3 left-0 w-full h-px bg-white/50" />
        </div>
        {/* Focal marker */}
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-2 ring-blue-500"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>초점 {Math.round(x)}% · {Math.round(y)}% — 이미지를 클릭/드래그</span>
        <button
          type="button"
          onClick={() => onChange('50% 50%')}
          className="rounded border border-gray-200 px-2 py-0.5 text-gray-600 hover:bg-gray-50"
        >
          가운데로
        </button>
      </div>
    </div>
  );
}
