#!/usr/bin/env node
/**
 * TrueLight — Claude Design 로컬 커넥터 (one-time).
 *
 * WHY THIS EXISTS: Anthropic's Claude Design MCP OAuth is a native-app (public)
 * client — its registration endpoint accepts ONLY loopback redirect_uris and
 * there is no device-code grant (verified 2026-09-11). So a server-hosted https
 * callback (api.truelight.app) can never register. The browser login must happen
 * on THIS machine against a loopback port. This script does that one dance, then
 * posts the resulting tokens back to the TrueLight server, which stores them
 * (refreshable) so the rest of the fetch→map→apply is console-native.
 *
 * USAGE (run once, from the repo root, after clicking "연결" in the console):
 *   node scripts/design-connect.mjs <connectToken> [apiBase]
 *
 *   <connectToken>  the single-use token the console shows you (15-min TTL)
 *   [apiBase]       default https://api.truelight.app
 *
 * No dependencies — Node 18+ built-ins only. Never prints token values.
 */
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const REGISTER_ENDPOINT = 'https://api.anthropic.com/v1/design/mcp/oauth/register';
const AUTHORIZE_ENDPOINT = 'https://claude.ai/oauth/authorize';
const TOKEN_ENDPOINT = 'https://api.anthropic.com/v1/design/mcp/oauth/token';
const SCOPE = 'user:design:read user:design:write';

const connectToken = process.argv[2];
const apiBase = (process.argv[3] || 'https://api.truelight.app').replace(/\/+$/, '');
if (!connectToken) {
  console.error('❌ connectToken 이 없습니다.\n   사용법: node scripts/design-connect.mjs <connectToken> [apiBase]');
  process.exit(1);
}

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const verifier = b64url(randomBytes(32));
const challenge = b64url(createHash('sha256').update(verifier).digest());
const state = b64url(randomBytes(24));

function openBrowser(url) {
  try {
    const p = process.platform;
    const cmd = p === 'win32' ? 'cmd' : p === 'darwin' ? 'open' : 'xdg-open';
    const args = p === 'win32' ? ['/c', 'start', '""', url.replace(/&/g, '^&')] : [url];
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* auto-open is best-effort — the URL is always printed too */
  }
}

async function main() {
  // 1. Bind a loopback listener first so we know the port for the redirect_uri.
  const port = await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const p = probe.address().port;
      probe.close(() => resolve(p));
    });
  });
  // Path MUST be /callback: Anthropic's canonical design client allows loopback
  // redirects port-agnostically but only at http://127.0.0.1/callback (or
  // localhost). A different path (e.g. /cb) → "redirect URI not supported by
  // client" at consent. (Claude Code's own loopback flow hardcodes /callback.)
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  // 2. Dynamic Client Registration (loopback → accepted). Public client, PKCE.
  const regRes = await fetch(REGISTER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: 'TrueLight Console (Claude Design import)',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: SCOPE,
    }),
  });
  if (!regRes.ok) throw new Error(`DCR 실패: HTTP ${regRes.status} ${(await regRes.text()).slice(0, 200)}`);
  const { client_id: clientId } = await regRes.json();
  if (!clientId) throw new Error('DCR 응답에 client_id 없음');

  const authorizeUrl =
    `${AUTHORIZE_ENDPOINT}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;

  // 3. Serve the loopback catcher, open the browser.
  const done = new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, redirectUri);
      if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
      const html = (ok, msg) =>
        `<!doctype html><meta charset="utf-8"><title>TrueLight × Claude Design</title>` +
        `<body style="font-family:system-ui,sans-serif;padding:56px;text-align:center;color:#16181d">` +
        `<p style="font-size:18px;font-weight:700;color:${ok ? '#16a34a' : '#dc2626'}">${ok ? '✓ ' : '✗ '}${msg}</p>` +
        `<p style="font-size:13px;color:#61697a">이 창을 닫고 TrueLight 콘솔로 돌아가세요.</p></body>`;
      try {
        const err = url.searchParams.get('error');
        if (err) throw new Error(`consent 취소/오류: ${err}`);
        const code = url.searchParams.get('code');
        const gotState = url.searchParams.get('state');
        if (!code) throw new Error('code 누락');
        if (gotState !== state) throw new Error('state 불일치 (위조 의심)');

        // 4. Exchange code → tokens (public client + PKCE).
        const tokRes = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: verifier,
          }),
        });
        if (!tokRes.ok) throw new Error(`token 교환 실패: HTTP ${tokRes.status} ${(await tokRes.text()).slice(0, 200)}`);
        const tok = await tokRes.json();
        if (!tok.access_token) throw new Error('token 응답에 access_token 없음');

        // 5. Hand the tokens to the TrueLight server (connect_token authed).
        const postRes = await fetch(`${apiBase}/api/v1/design/oauth/local/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            connectToken,
            clientId,
            accessToken: tok.access_token,
            refreshToken: tok.refresh_token ?? null,
            expiresIn: tok.expires_in ?? null,
            scope: tok.scope ?? SCOPE,
          }),
        });
        if (!postRes.ok) throw new Error(`서버 전달 실패: HTTP ${postRes.status} ${(await postRes.text()).slice(0, 200)}`);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html(true, 'Claude Design 연결 완료'));
        server.close();
        resolve();
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }).end(html(false, e.message));
        server.close();
        reject(e);
      }
    });
    server.listen(port, '127.0.0.1', () => {
      console.log('\n🔗 브라우저에서 claude.ai 로그인/동의를 진행하세요. 창이 안 열리면 아래 URL 을 직접 여세요:\n');
      console.log('   ' + authorizeUrl + '\n');
      openBrowser(authorizeUrl);
    });
    setTimeout(() => { server.close(); reject(new Error('시간 초과(5분) — 다시 시도하세요.')); }, 5 * 60 * 1000);
  });

  await done;
}

main().then(
  () => { console.log('✅ 완료 — TrueLight 콘솔에 "연결됨" 으로 표시됩니다.'); process.exit(0); },
  (e) => { console.error('\n❌ ' + (e?.message || e)); process.exit(1); },
);
