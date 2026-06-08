// LivePreviewPane — center pane of the super-admin page builder.
//
// Renders the tenant's ACTUAL public page in an iframe so the operator sees
// real rendering (same BlockRenderer + theme the visitor gets) without
// re-bundling @dw-church/ui-components into the admin SPA.
//
// FLICKER-FREE updates via DOUBLE BUFFERING: two stacked iframes. The visible
// one stays painted while the hidden one preloads the new URL; once it
// finishes loading we swap them. The operator never sees a blank/white flash
// on save — matching b2bsmart's local-render preview feel.
//
// The public page fetches with cache:'no-store', so each load is fresh.
import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  tenantOrigin: string;
  pagePath: string;
  /** Bump to reload the preview (after a save). */
  reloadNonce: number;
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
}

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 834, mobile: 390 };
const DEVICE_LABEL: Record<Device, string> = { desktop: '데스크탑', tablet: '태블릿', mobile: '모바일' };

export function LivePreviewPane({ tenantOrigin, pagePath, reloadNonce, selectedSectionId, onSelectSection }: Props) {
  const [device, setDevice] = useState<Device>('desktop');
  const [manualBump, setManualBump] = useState(0);

  const frameOrigin = useMemo(() => {
    try { return new URL(tenantOrigin).origin; } catch { return ''; }
  }, [tenantOrigin]);

  const src = useMemo(() => {
    const path = pagePath ? `/${pagePath.replace(/^\/+/, '')}` : '/';
    return `${tenantOrigin}${path}?preview=1&__pv=${reloadNonce}-${manualBump}`;
  }, [tenantOrigin, pagePath, reloadNonce, manualBump]);

  // Two buffers (A=0, B=1). `active` is the visible one.
  const [srcs, setSrcs] = useState<[string, string]>([src, 'about:blank']);
  const [active, setActive] = useState(0);
  const refs = [useRef<HTMLIFrameElement>(null), useRef<HTMLIFrameElement>(null)];

  // Load every new src into the INACTIVE buffer; it becomes active on load.
  useEffect(() => {
    const inactive = active === 0 ? 1 : 0;
    setSrcs((prev) => {
      if (prev[inactive] === src) return prev;
      const n: [string, string] = [prev[0], prev[1]];
      n[inactive] = src;
      return n;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const pushHighlight = (idx: number) => {
    if (!frameOrigin) return;
    refs[idx]?.current?.contentWindow?.postMessage(
      { type: 'dw-preview:highlight', sectionId: selectedSectionId ?? null },
      frameOrigin,
    );
  };

  const handleLoad = (idx: number) => {
    // Promote the freshly-loaded buffer if it holds the latest src.
    if (srcs[idx] === src) {
      if (idx !== active) setActive(idx);
      // give the bridge a tick to attach, then sync the highlight
      setTimeout(() => pushHighlight(idx), 30);
    }
  };

  // Section clicks + bridge-ready from the embedded preview.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== frameOrigin && !/\.truelight\.app$/.test((() => { try { return new URL(e.origin).host; } catch { return ''; } })())) return;
      const d = e.data as { type?: string; sectionId?: string } | null;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'dw-preview:ready') pushHighlight(active);
      if (d.type === 'dw-preview:select' && d.sectionId) onSelectSection?.(d.sectionId);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameOrigin, onSelectSection, active]);

  // Re-sync highlight when the selection changes.
  useEffect(() => { pushHighlight(active); /* eslint-disable-next-line */ }, [selectedSectionId, active]);

  const width = DEVICE_WIDTH[device];

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${device === d ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>
              {DEVICE_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[220px] truncate font-mono text-[10px] text-gray-400 sm:inline">
            {tenantOrigin}{pagePath ? `/${pagePath}` : '/'}
          </span>
          <button type="button" onClick={() => setManualBump((n) => n + 1)} title="미리보기 새로고침"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">↻ 새로고침</button>
          <a href={src} target="_blank" rel="noopener noreferrer" title="새 탭에서 열기"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">↗</a>
        </div>
      </div>

      {/* Frame area (double-buffered) */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative mx-auto h-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm transition-[max-width] duration-200"
          style={{ maxWidth: width ? `${width}px` : '100%' }}>
          {[0, 1].map((idx) => (
            <iframe
              key={idx}
              ref={refs[idx]}
              src={srcs[idx]}
              title={`페이지 미리보기 ${idx}`}
              onLoad={() => handleLoad(idx)}
              className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${active === idx ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
