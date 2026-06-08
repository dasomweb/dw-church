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
import { useMemo, useState } from 'react';

interface Props {
  /** Public web origin for the tenant subdomain, e.g. https://lagrangechurch.truelight.app */
  tenantOrigin: string;
  /** Page path under the origin — '' for the home page, else the page slug. */
  pagePath: string;
  /** Bump to force a fresh iframe reload (e.g. after a section save). */
  reloadNonce: number;
}

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 834, mobile: 390 };
const DEVICE_LABEL: Record<Device, string> = { desktop: '데스크탑', tablet: '태블릿', mobile: '모바일' };

export function LivePreviewPane({ tenantOrigin, pagePath, reloadNonce }: Props) {
  const [device, setDevice] = useState<Device>('desktop');
  // Local refresh counter is folded into the same nonce the parent
  // controls, so the manual 새로고침 button and post-save reloads share
  // one cache-busting param.
  const [manualBump, setManualBump] = useState(0);

  const src = useMemo(() => {
    const path = pagePath ? `/${pagePath.replace(/^\/+/, '')}` : '/';
    // __pv cache-busts the iframe document (new URL → fresh navigation).
    return `${tenantOrigin}${path}?__pv=${reloadNonce}-${manualBump}`;
  }, [tenantOrigin, pagePath, reloadNonce, manualBump]);

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
          <iframe
            key={src}
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
