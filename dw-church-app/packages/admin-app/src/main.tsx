import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Support both embedded (WordPress) and standalone (SaaS) modes
const rootEl =
  document.getElementById('dw-church-admin-root') ||
  document.getElementById('root');

if (rootEl) {
  // API base URL: WordPress embed → env override (dev only) → same-origin (prod)
  // Production: admin service proxies /api/* to api-server via Railway internal network.
  const resolveBaseUrl = (): string => {
    if (rootEl.dataset.restUrl) return rootEl.dataset.restUrl;
    if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL as string;
    }
    return window.location.origin;
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
