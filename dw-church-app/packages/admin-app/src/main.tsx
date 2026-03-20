import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Support both embedded (WordPress) and standalone (SaaS) modes
const rootEl =
  document.getElementById('dw-church-admin-root') ||
  document.getElementById('root');

if (rootEl) {
  const config = {
    baseUrl:
      rootEl.dataset.restUrl ||
      (import.meta.env.VITE_API_BASE_URL as string) ||
      window.location.origin,
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
