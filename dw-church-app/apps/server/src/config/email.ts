import nodemailer from 'nodemailer';
import { env } from './env.js';
import { prisma } from './database.js';

/**
 * Outbound email. Config is loaded from the super-admin-managed email_settings
 * table (DB) with env vars as fallback, and cached briefly. The super admin can
 * change SMTP host/credentials and the from-addresses (info/order/support)
 * without a redeploy; invalidateMailCache() clears the cache on save.
 */
interface MailConfig {
  provider: 'smtp' | 'resend';
  resendApiKey: string;
  resendFrom: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromInfo: string;
  fromOrder: string;
  fromSupport: string;
  fromName: string;
}

let cache: { cfg: MailConfig; at: number } | null = null;
const TTL_MS = 30_000;

export function invalidateMailCache(): void {
  cache = null;
}

async function loadConfig(): Promise<MailConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.cfg;

  let row: Record<string, unknown> | null = null;
  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM public.email_settings WHERE id = 1`,
    );
    row = rows[0] ?? null;
  } catch {
    // table may not exist yet (pre-migration) — fall back to env
  }

  const port = Number(row?.smtp_port ?? env.SMTP_PORT ?? 587);
  const fromInfo = (row?.from_info as string) || env.EMAIL_FROM || '';
  const provider = (row?.provider as string) === 'resend' ? 'resend' : 'smtp';
  const cfg: MailConfig = {
    provider,
    resendApiKey: (row?.resend_api_key as string) || env.RESEND_API_KEY || '',
    resendFrom: (row?.resend_from as string) || '',
    host: (row?.smtp_host as string) || env.SMTP_HOST || '',
    port,
    secure: (row?.smtp_secure as boolean | undefined) ?? port === 465,
    user: (row?.smtp_user as string) || env.SMTP_USER || '',
    pass: (row?.smtp_pass as string) || env.SMTP_PASS || '',
    fromInfo,
    fromOrder: (row?.from_order as string) || fromInfo,
    fromSupport: (row?.from_support as string) || fromInfo,
    fromName: (row?.from_name as string) || 'TRUE LIGHT',
  };
  cache = { cfg, at: Date.now() };
  return cfg;
}

/**
 * Send via Resend's HTTP API (POST /emails). Kept dependency-free (fetch) —
 * from is required; for a BCC-only blast the visible To is the sender itself
 * so recipients never see each other. `bcc` capped by the caller's batch size
 * (Resend allows up to 50 addresses per to/bcc field).
 */
async function sendViaResend(
  cfg: MailConfig,
  args: { from: string; to: string; bcc: string[]; subject: string; html: string },
): Promise<void> {
  const body: Record<string, unknown> = {
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  };
  if (args.bcc.length) body.bcc = args.bcc;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  console.log(
    `[email:resend] sent to=${args.to} bcc=${args.bcc.length} subject="${args.subject}" id=${json.id ?? '?'}`,
  );
}

export async function sendEmail(opts: {
  to?: string;
  bcc?: string[];
  subject: string;
  html: string;
  from?: 'info' | 'order' | 'support';
}): Promise<void> {
  const cfg = await loadConfig();
  const useResend = cfg.provider === 'resend' && !!cfg.resendApiKey;
  if (!useResend && !cfg.host) {
    console.warn('[email] provider not configured (no SMTP host / Resend key), skipping:', opts.subject);
    return;
  }
  const bcc = (opts.bcc ?? []).filter(Boolean);
  if (!opts.to && bcc.length === 0) {
    console.warn('[email] no recipients, skipping:', opts.subject);
    return;
  }

  // Resolve the From address (shared by both providers).
  const resolvedFromAddr =
    opts.from === 'order' ? cfg.fromOrder : opts.from === 'support' ? cfg.fromSupport : cfg.fromInfo;

  if (useResend) {
    // Resend requires an explicit sender; prefer the dedicated resendFrom
    // (must be a verified domain), else the fromName<fromInfo> pair.
    const from =
      cfg.resendFrom ||
      (cfg.fromName && resolvedFromAddr ? `${cfg.fromName} <${resolvedFromAddr}>` : resolvedFromAddr);
    const to = opts.to || resolvedFromAddr;
    try {
      await sendViaResend(cfg, { from, to, bcc, subject: opts.subject, html: opts.html });
    } catch (err) {
      console.error(`[email:resend] SEND FAILED to=${to} bcc=${bcc.length}:`, (err as Error)?.message || err);
      throw err;
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure || cfg.port === 465,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    // Fail fast with a clear error rather than hanging on a bad host/firewall.
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  const fromAddr =
    opts.from === 'order' ? cfg.fromOrder : opts.from === 'support' ? cfg.fromSupport : cfg.fromInfo;
  const from = cfg.fromName && fromAddr ? `${cfg.fromName} <${fromAddr}>` : fromAddr;
  // For a BCC-only blast, the visible To is the sender itself so recipients
  // never see each other (and the message isn't headerless).
  const visibleTo = opts.to || fromAddr;

  try {
    const info = await transporter.sendMail({
      from,
      to: visibleTo,
      bcc: bcc.length ? bcc : undefined,
      subject: opts.subject,
      html: opts.html,
    });
    console.log(
      `[email] sent to=${visibleTo} bcc=${bcc.length} subject="${opts.subject}" via=${cfg.host}:${cfg.port} ` +
        `id=${info.messageId} accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} resp=${JSON.stringify(info.response)}`,
    );
  } catch (err) {
    console.error(`[email] SEND FAILED to=${visibleTo} bcc=${bcc.length} via=${cfg.host}:${cfg.port}:`, (err as Error)?.message || err);
    throw err;
  }
}
