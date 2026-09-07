import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '3000', 10);
const API_TARGET = process.env.API_SERVER_URL;

if (!API_TARGET) {
  console.error('[admin] API_SERVER_URL is required (e.g. http://api-server.railway.internal:3000)');
  process.exit(1);
}

const app = express();

// Legacy same-origin /api proxy (embed.js / any same-origin caller). The admin
// SPA itself now calls the API at its absolute host (api.truelight.app), so it
// works on every origin (admin.truelight.app AND each tenant's own domain).
app.use(
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    xfwd: true,
    pathFilter: '/api',
  }),
);

// The SPA is built with Vite base '/admin/', so it is served UNDER /admin on
// BOTH admin.truelight.app (super-admin console) and each tenant's own domain
// (<tenant>/admin — the Cloudflare Worker forwards those paths here). Hashed
// assets live at /admin/assets/* (immutable); index.html is never cached (it
// references the current chunk hashes). SPA fallback: any /admin/* → index.html.
const staticOpts = {
  index: false,
  setHeaders(res, filePath) {
    res.setHeader(
      'Cache-Control',
      filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    );
  },
};
app.use('/admin', express.static(DIST, staticOpts));
app.get('/admin', (_req, res) => res.redirect(302, '/admin/'));
app.get('/admin/*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIST, 'index.html'));
});

// Everything else → the canonical /admin-prefixed URL. This covers:
//   - "/"                       → /admin/
//   - "/login", "/forgot-password", "/reset-password", "/register"
//       (the friendly <tenant>/login the Worker forwards here, and direct
//        hits on admin.truelight.app/login)
//   - legacy emailed links: /t/<slug>/login, /reset-password?token=…,
//     /super-admin, etc.  → /admin/t/<slug>/login, /admin/reset-password?…
// Query string is preserved via req.originalUrl.
app.get('*', (req, res) => res.redirect(302, '/admin' + req.originalUrl));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[admin] serving ${DIST} under /admin on :${PORT} — /api → ${API_TARGET}`);
});
