import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Support both embedded (WordPress) and standalone (SaaS) modes
const rootEl =
  document.getElementById('dw-church-admin-root') ||
  document.getElementById('root');

if (rootEl) {
  // API base URL: env var → data attribute → production default → current origin
  const resolveBaseUrl = (): string => {
    if (rootEl.dataset.restUrl) return rootEl.dataset.restUrl;
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL as string;
    // Production fallback: admin.truelight.app → api.truelight.app
    if (window.location.hostname.startsWith('admin.')) {
      return window.location.origin.replace('admin.', 'api.');
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
