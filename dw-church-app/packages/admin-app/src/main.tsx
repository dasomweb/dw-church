import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
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
  const resolveBaseUrl = (): string => {
    if (rootEl.dataset.restUrl) return rootEl.dataset.restUrl;
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL as string;
    if (import.meta.env.DEV) return window.location.origin; // vite dev proxy
    return 'https://api.truelight.app';
  };

  const config = {
    baseUrl: resolveBaseUrl(),
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
