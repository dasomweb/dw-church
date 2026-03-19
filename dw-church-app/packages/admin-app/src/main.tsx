import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// When embedded in WordPress, read config from DOM element
const rootEl = document.getElementById('dw-church-admin-root');

if (rootEl) {
  const config = {
    baseUrl: rootEl.dataset.restUrl || '/wp-json',
    nonce: rootEl.dataset.nonce || '',
    postId: rootEl.dataset.postId ? parseInt(rootEl.dataset.postId, 10) : undefined,
    postType: rootEl.dataset.postType || undefined,
  };

  createRoot(rootEl).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
}
