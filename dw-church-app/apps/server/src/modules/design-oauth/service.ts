/**
 * Claude Design OAuth — connects the TrueLight console to the operator's
 * claude.ai Design account so the server can fetch a Claude Design canvas via the
 * design MCP (api.anthropic.com/v1/design/mcp) and import it into a tenant.
 *
 * ⚠ HARD CONSTRAINT (verified 2026-09-11 by direct probe of the DCR endpoint):
 * the design MCP OAuth is a **native-app (public) client** —
 *   • registration accepts ONLY loopback redirect_uris
 *     (http://127.0.0.1:PORT / http://localhost:PORT). Any https:// callback is
 *     rejected 400 "only loopback redirect_uris are accepted".
 *   • grant_types_supported = authorization_code, refresh_token  (NO device flow).
 *   • token_endpoint_auth_method = none  (public client, PKCE S256 required).
 * So a server-hosted https callback (api.truelight.app) can NEVER register. The
 * browser login must happen on the operator's machine against a loopback port.
 *
 * Model (operator picked "1회 로컬 커넥터 + 자동 fetch"):
 *   1. Console → POST /design/oauth/local/init  → server mints a single-use,
 *      15-min connect_token bound to the super-admin, returns the one-line command.
 *   2. Operator runs `node scripts/design-connect.mjs <connect_token>` once locally.
 *      The connector does the loopback OAuth in the browser (DCR → PKCE → authorize
 *      → token) and POSTs the resulting tokens back to
 *      /design/oauth/local/complete with the connect_token.
 *   3. Server stores tokens (+ the loopback client_id used, for refresh) per
 *      super-admin. getAccessToken() refreshes with that client_id. After that the
 *      whole fetch→map→apply is console-native.
 *
 * Tokens are stored as-is (super-admin only, global public schema). Encrypting at
 * rest is a follow-up. Never log token values.
 */
import { randomBytes } from 'node:crypto';
import { prisma } from '../../config/database.js';

export const TOKEN_ENDPOINT = 'https://api.anthropic.com/v1/design/mcp/oauth/token';
export const AUTHORIZE_ENDPOINT = 'https://claude.ai/oauth/authorize';
export const REGISTER_ENDPOINT = 'https://api.anthropic.com/v1/design/mcp/oauth/register';
export const DESIGN_SCOPE = 'user:design:read user:design:write';
/** MCP resource server — the connector requests a token scoped to this. */
export const DESIGN_MCP_URL = 'https://api.anthropic.com/v1/design/mcp';

const CONNECT_TTL_MIN = 15;
const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Global tables (public schema) — created at startup (see index.ts). */
export async function ensureDesignOauthTables(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS public.design_oauth (
       user_id TEXT PRIMARY KEY,
       access_token TEXT NOT NULL,
       refresh_token TEXT,
       expires_at TIMESTAMPTZ,
       scope TEXT,
       client_id TEXT,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
  // Older deploys created design_oauth without client_id — add it in place.
  await prisma.$executeRawUnsafe(
    `ALTER TABLE public.design_oauth ADD COLUMN IF NOT EXISTS client_id TEXT`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS public.design_oauth_connect (
       connect_token TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
}

const API_BASE = process.env.API_PUBLIC_BASE || 'https://api.truelight.app';

export interface LocalConnectInit {
  connectToken: string;
  /** Exact one-line command the operator runs locally (repo root). */
  command: string;
  /** api base the connector posts back to (only non-default is passed as arg). */
  apiBase: string;
  expiresInMinutes: number;
}

/**
 * Mint a single-use connect_token bound to this super-admin and return the local
 * command. The connector authenticates its /complete callback with this token, so
 * no TrueLight JWT has to leave the browser.
 */
export async function initLocalConnect(userId: string): Promise<LocalConnectInit> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM public.design_oauth_connect WHERE created_at < NOW() - INTERVAL '${CONNECT_TTL_MIN} minutes'`,
  );
  const connectToken = b64url(randomBytes(24));
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.design_oauth_connect (connect_token, user_id) VALUES ($1, $2)`,
    connectToken,
    userId,
  );
  const isDefaultBase = API_BASE === 'https://api.truelight.app';
  const command = isDefaultBase
    ? `node scripts/design-connect.mjs ${connectToken}`
    : `node scripts/design-connect.mjs ${connectToken} ${API_BASE}`;
  return { connectToken, command, apiBase: API_BASE, expiresInMinutes: CONNECT_TTL_MIN };
}

export interface CompleteLocalConnectInput {
  connectToken: string;
  clientId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  scope?: string | null;
}

/**
 * The local connector calls this (authenticated only by the unguessable, single-
 * use, 15-min connect_token) with the tokens it obtained. Validate + store.
 */
export async function completeLocalConnect(input: CompleteLocalConnectInput): Promise<{ userId: string }> {
  const { connectToken, clientId, accessToken } = input;
  if (!connectToken || !clientId || !accessToken) throw new Error('connectToken/clientId/accessToken 필수');
  const rows = await prisma.$queryRawUnsafe<{ user_id: string }[]>(
    `SELECT user_id FROM public.design_oauth_connect
       WHERE connect_token = $1 AND created_at > NOW() - INTERVAL '${CONNECT_TTL_MIN} minutes'`,
    connectToken,
  );
  const row = rows[0];
  if (!row) throw new Error('유효하지 않은 connect_token (만료 또는 위조) — 콘솔에서 다시 시작하세요.');
  await prisma.$executeRawUnsafe(`DELETE FROM public.design_oauth_connect WHERE connect_token = $1`, connectToken);

  const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.design_oauth (user_id, access_token, refresh_token, expires_at, scope, client_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token,
       expires_at = EXCLUDED.expires_at, scope = EXCLUDED.scope, client_id = EXCLUDED.client_id,
       updated_at = NOW()`,
    row.user_id,
    accessToken,
    input.refreshToken ?? null,
    expiresAt,
    input.scope ?? DESIGN_SCOPE,
    clientId,
  );
  return { userId: row.user_id };
}

export interface DesignOauthStatus {
  connected: boolean;
  scope?: string;
  expiresAt?: string | null;
  updatedAt?: string;
}

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

interface TokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }

/**
 * Return a valid access token for the user, refreshing with the stored
 * refresh_token + client_id (public client, no secret) when near expiry. Used by
 * the design-import (MCP fetch) step. Throws if not connected.
 */
export async function getAccessToken(userId: string): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<
    { access_token: string; refresh_token: string | null; expires_at: Date | null; client_id: string | null }[]
  >(
    `SELECT access_token, refresh_token, expires_at, client_id FROM public.design_oauth WHERE user_id = $1`,
    userId,
  );
  const r = rows[0];
  if (!r) throw new Error('Claude Design 연결 안 됨 — 먼저 콘솔에서 연결하세요.');
  const stillValid = !r.expires_at || r.expires_at.getTime() - Date.now() > 60_000;
  if (stillValid) return r.access_token;
  if (!r.refresh_token || !r.client_id) return r.access_token; // no refresh material — try as-is

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: r.refresh_token, client_id: r.client_id }),
  });
  if (!res.ok) throw new Error(`refresh 실패: HTTP ${res.status} — 콘솔에서 다시 연결하세요.`);
  const d = (await res.json()) as TokenResponse;
  if (!d.access_token) throw new Error('refresh: no access_token');
  const expiresAt = d.expires_in ? new Date(Date.now() + d.expires_in * 1000) : null;
  await prisma.$executeRawUnsafe(
    `UPDATE public.design_oauth
       SET access_token = $2, refresh_token = COALESCE($3, refresh_token), expires_at = $4, updated_at = NOW()
     WHERE user_id = $1`,
    userId,
    d.access_token,
    d.refresh_token ?? null,
    expiresAt,
  );
  return d.access_token;
}
