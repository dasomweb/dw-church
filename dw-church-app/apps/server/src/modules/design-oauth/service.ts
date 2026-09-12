/**
 * Claude Design OAuth — lets the TrueLight console connect to the operator's
 * claude.ai Design account so the server can fetch a Claude Design canvas via the
 * design MCP (api.anthropic.com/v1/design/mcp) and import it into a tenant.
 *
 * The design MCP is a standard OAuth 2.0 protected resource (verified 2026-09-12):
 *   authorize  = https://claude.ai/oauth/authorize
 *   token      = https://api.anthropic.com/v1/design/mcp/oauth/token
 *   register   = https://api.anthropic.com/v1/design/mcp/oauth/register  (DCR)
 *   pkce S256, public client (token_endpoint_auth_method: none), refresh_token
 *   scopes     = user:design:read user:design:write
 *
 * Flow: startAuth (DCR once → PKCE + state → authorize URL) → user logs in at
 * claude.ai + consents → callback (state → code → token) → tokens stored per
 * super-admin user (global public.design_oauth). getAccessToken refreshes.
 *
 * ⚠ Tokens are stored as-is (super-admin only, global). Encrypting at rest is a
 * follow-up. Never log token values.
 */
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../config/database.js';

const REGISTER_ENDPOINT = 'https://api.anthropic.com/v1/design/mcp/oauth/register';
const AUTHORIZE_ENDPOINT = 'https://claude.ai/oauth/authorize';
const TOKEN_ENDPOINT = 'https://api.anthropic.com/v1/design/mcp/oauth/token';
export const DESIGN_SCOPE = 'user:design:read user:design:write';

// The redirect_uri must be a fixed, https, registered URL the browser lands on
// after claude.ai consent. api.truelight.app fronts the api-server.
const API_BASE = process.env.API_PUBLIC_BASE || 'https://api.truelight.app';
export const CALLBACK_URL = `${API_BASE}/api/v1/design/oauth/callback`;

const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Global tables (public schema) — created at startup (see index.ts). */
export async function ensureDesignOauthTables(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS public.design_oauth_client (
       client_id TEXT PRIMARY KEY,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS public.design_oauth (
       user_id TEXT PRIMARY KEY,
       access_token TEXT NOT NULL,
       refresh_token TEXT,
       expires_at TIMESTAMPTZ,
       scope TEXT,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS public.design_oauth_pending (
       state TEXT PRIMARY KEY,
       code_verifier TEXT NOT NULL,
       user_id TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
}

interface DcrResponse { client_id?: string }

/** Reuse the stored DCR client_id, else register a new public client. */
async function getClientId(): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<{ client_id: string }[]>(
    `SELECT client_id FROM public.design_oauth_client LIMIT 1`,
  );
  if (rows[0]?.client_id) return rows[0].client_id;

  const res = await fetch(REGISTER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: 'TrueLight Console (Claude Design import)',
      redirect_uris: [CALLBACK_URL],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: DESIGN_SCOPE,
    }),
  });
  if (!res.ok) throw new Error(`DCR failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const d = (await res.json()) as DcrResponse;
  if (!d.client_id) throw new Error('DCR: no client_id in response');
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.design_oauth_client (client_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    d.client_id,
  );
  return d.client_id;
}

/** Begin the OAuth flow — returns the claude.ai authorize URL for the popup. */
export async function startAuth(userId: string): Promise<{ authorizeUrl: string }> {
  const clientId = await getClientId();
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const state = b64url(randomBytes(24));
  // GC old pending rows (>15 min) then store this one.
  await prisma.$executeRawUnsafe(`DELETE FROM public.design_oauth_pending WHERE created_at < NOW() - INTERVAL '15 minutes'`);
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.design_oauth_pending (state, code_verifier, user_id) VALUES ($1, $2, $3)`,
    state, verifier, userId,
  );
  const authorizeUrl =
    `${AUTHORIZE_ENDPOINT}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
    `&scope=${encodeURIComponent(DESIGN_SCOPE)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;
  return { authorizeUrl };
}

interface TokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }

/** OAuth redirect callback — exchange code (state-validated) for tokens + store. */
export async function handleCallback(code: string, state: string): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ code_verifier: string; user_id: string }[]>(
    `SELECT code_verifier, user_id FROM public.design_oauth_pending WHERE state = $1`,
    state,
  );
  const pending = rows[0];
  if (!pending) throw new Error('유효하지 않은 state (만료되었거나 위조)');
  await prisma.$executeRawUnsafe(`DELETE FROM public.design_oauth_pending WHERE state = $1`, state);

  const clientId = await getClientId();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: CALLBACK_URL,
    client_id: clientId,
    code_verifier: pending.code_verifier,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`token exchange failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const d = (await res.json()) as TokenResponse;
  if (!d.access_token) throw new Error('token exchange: no access_token');
  const expiresAt = d.expires_in ? new Date(Date.now() + d.expires_in * 1000) : null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.design_oauth (user_id, access_token, refresh_token, expires_at, scope, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token,
       expires_at = EXCLUDED.expires_at, scope = EXCLUDED.scope, updated_at = NOW()`,
    pending.user_id, d.access_token, d.refresh_token ?? null, expiresAt, d.scope ?? DESIGN_SCOPE,
  );
}

export interface DesignOauthStatus { connected: boolean; scope?: string; expiresAt?: string | null; updatedAt?: string }

export async function getStatus(userId: string): Promise<DesignOauthStatus> {
  const rows = await prisma.$queryRawUnsafe<{ scope: string | null; expires_at: Date | null; updated_at: Date }[]>(
    `SELECT scope, expires_at, updated_at FROM public.design_oauth WHERE user_id = $1`,
    userId,
  );
  const r = rows[0];
  if (!r) return { connected: false };
  return {
    connected: true,
    scope: r.scope ?? undefined,
    expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function disconnect(userId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`DELETE FROM public.design_oauth WHERE user_id = $1`, userId);
}

/**
 * Get a valid access token for the user, refreshing with the refresh_token when
 * expired. Used by the design-import (MCP fetch) step. Throws if not connected.
 */
export async function getAccessToken(userId: string): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<{ access_token: string; refresh_token: string | null; expires_at: Date | null }[]>(
    `SELECT access_token, refresh_token, expires_at FROM public.design_oauth WHERE user_id = $1`,
    userId,
  );
  const r = rows[0];
  if (!r) throw new Error('Claude Design 연결 안 됨 — 먼저 로그인하세요.');
  const stillValid = !r.expires_at || r.expires_at.getTime() - Date.now() > 60_000;
  if (stillValid) return r.access_token;
  if (!r.refresh_token) return r.access_token; // no refresh — try as-is
  // refresh
  const clientId = await getClientId();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: r.refresh_token, client_id: clientId }),
  });
  if (!res.ok) throw new Error(`refresh failed: HTTP ${res.status} — 다시 로그인하세요.`);
  const d = (await res.json()) as TokenResponse;
  if (!d.access_token) throw new Error('refresh: no access_token');
  const expiresAt = d.expires_in ? new Date(Date.now() + d.expires_in * 1000) : null;
  await prisma.$executeRawUnsafe(
    `UPDATE public.design_oauth SET access_token = $2, refresh_token = COALESCE($3, refresh_token), expires_at = $4, updated_at = NOW() WHERE user_id = $1`,
    userId, d.access_token, d.refresh_token ?? null, expiresAt,
  );
  return d.access_token;
}
