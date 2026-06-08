// LivePreviewPane — center pane of the super-admin page builder.
//
// Renders the tenant's ACTUAL public page in an iframe so the operator
// sees real rendering (same BlockRenderer + theme the visitor gets),
// without re-bundling @dw-church/ui-components into the admin SPA. The
// public page fetches pages/sections with `cache: 'no-store'`
// (apps/web/lib/api.ts), so every reload shows fresh data — bumping
// `reloadNonce` after a save reflects the edit immediately.
//
// Device-width presets mirror b2bsmart's preview: desktop / tablet /
// mobile. The web app sets no X-Frame-Options / CSP frame-ancestors, so
// cross-subdomain embedding (admin.truelight.app → {slug}.truelight.app)
// is allowed.
import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  /** Public web origin for the tenant subdomain, e.g. https://lagrangechurch.truelight.app */
  tenantOrigin: string;
  /** Page path under the origin — '' for the home page, else the page slug. */
  pagePath: string;
  /** Bump to force a fresh iframe reload (e.g. after a section save). */
  reloadNonce: number;
  /** Currently selected section — pushed to the preview to outline it. */
  selectedSectionId?: string | null;
  /** Fired when the operator clicks a section inside the preview. */
  onSelectSection?: (sectionId: string) => void;
}

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 834, mobile: 390 };
const DEVICE_LABEL: Record<Device, string> = { desktop: '데스크탑', tablet: '태블릿', mobile: '모바일' };

export function LivePreviewPane({ tenantOrigin, pagePath, reloadNonce, selectedSectionId, onSelectSection }: Props) {
  const [device, setDevice] = useState<Device>('desktop');
  // Local refresh counter is folded into the same nonce the parent
  // controls, so the manual 새로고침 button and post-save reloads share
  // one cache-busting param.
  const [manualBump, setManualBump] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [bridgeReady, setBridgeReady] = useState(false);

  const frameOrigin = useMemo(() => {
    try { return new URL(tenantOrigin).origin; } catch { return ''; }
  }, [tenantOrigin]);

  const src = useMemo(() => {
    const path = pagePath ? `/${pagePath.replace(/^\/+/, '')}` : '/';
    // __pv cache-busts the iframe document (new URL → fresh navigation);
    // preview=1 activates the in-page PreviewBridge (click→select).
    return `${tenantOrigin}${path}?preview=1&__pv=${reloadNonce}-${manualBump}`;
  }, [tenantOrigin, pagePath, reloadNonce, manualBump]);

  // Receive section clicks from the embedded preview. Origin-checked: only
  // trust messages from the tenant's own frame (or any *.truelight.app).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== frameOrigin && !/\.truelight\.app$/.test(new URL(e.origin || 'http://x').host)) return;
      const d = e.data as { type?: string; sectionId?: string } | null;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'dw-preview:ready') setBridgeReady(true);
      if (d.type === 'dw-preview:select' && d.sectionId) onSelectSection?.(d.sectionId);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [frameOrigin, onSelectSection]);

  // Reset bridge readiness whenever the frame reloads (new src).
  useEffect(() => { setBridgeReady(false); }, [src]);

  // Push the current selection into the preview so it outlines the section
  // (on select, and once the bridge announces readiness after a reload).
  useEffect(() => {
    if (!frameOrigin) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'dw-preview:highlight', sectionId: selectedSectionId ?? null },
      frameOrigin,
    );
  }, [selectedSectionId, bridgeReady, frameOrigin]);

  const width = DEVICE_WIDTH[device];

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                device === d ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {DEVICE_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[220px] truncate font-mono text-[10px] text-gray-400 sm:inline">
            {tenantOrigin}{pagePath ? `/${pagePath}` : '/'}
          </span>
          <button
            type="button"
            onClick={() => setManualBump((n) => n + 1)}
            title="미리보기 새로고침"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            ↻ 새로고침
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title="새 탭에서 열기"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            ↗
          </a>
        </div>
      </div>

      {/* Frame */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="mx-auto h-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm transition-[max-width] duration-200"
          style={{ maxWidth: width ? `${width}px` : '100%' }}
        >
          {/* No key={src}: updating src navigates the existing iframe in
              place (browser keeps the old document painted until the new one
              is ready) instead of React remounting it — which caused a white
              flash on every edit. */}
          <iframe
            ref={iframeRef}
            src={src}
            title="페이지 미리보기"
            className="h-full w-full"
            // sandbox kept permissive — the preview must run the tenant's
            // own scripts (Next hydration, sliders) to render faithfully.
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
