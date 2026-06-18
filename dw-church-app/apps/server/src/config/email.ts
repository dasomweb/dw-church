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
  const cfg: MailConfig = {
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

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  from?: 'info' | 'order' | 'support';
}): Promise<void> {
  const cfg = await loadConfig();
  if (!cfg.host) {
    console.warn('[email] SMTP not configured, skipping:', opts.subject);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure || cfg.port === 465,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });

  const fromAddr =
    opts.from === 'order' ? cfg.fromOrder : opts.from === 'support' ? cfg.fromSupport : cfg.fromInfo;
  const from = cfg.fromName && fromAddr ? `${cfg.fromName} <${fromAddr}>` : fromAddr;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
