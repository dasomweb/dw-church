import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { resolveApiBaseUrl } from './lib/api-base';
import './index.css';

// Support both embedded (WordPress) and standalone (SaaS) modes
const rootEl =
  document.getElementById('dw-church-admin-root') ||
  document.getElementById('root');

if (rootEl) {
  // API base URL: WordPress embed → env override → absolute api.truelight.app (prod).
  // The admin SPA now runs on MULTIPLE origins (admin.truelight.app for super-admin
  // AND each tenant's own domain at <tenant>/admin for staff), so a same-origin
  // "/api" proxy no longer works everywhere — a tenant origin does not proxy /api.
  // We therefore always call the API at its absolute host. Auth is a Bearer token
  // (no cookies), and server CORS is origin:'*' credentials:false, so cross-origin
  // calls from any tenant domain are allowed.
  // 해석 규칙은 lib/api-base.ts 단일 출처(로그인 화면의 공개 조회도 같은 규칙 사용).
  const config = {
    baseUrl: resolveApiBaseUrl(rootEl.dataset.restUrl),
    nonce: rootEl.dataset.nonce || '',
    postId: rootEl.dataset.postId
      ? parseInt(rootEl.dataset.postId, 10)
      : undefined,
    postType: rootEl.dataset.postType || undefined,
  };

  createRoot(rootEl).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
}
// build trigger 1774928579
