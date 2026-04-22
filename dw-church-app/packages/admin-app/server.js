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

app.use(
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    xfwd: true,
    pathFilter: '/api',
  }),
);

app.use(express.static(DIST, { index: false, maxAge: '1h' }));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[admin] serving ${DIST} on :${PORT} — /api → ${API_TARGET}`);
});
