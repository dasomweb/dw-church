import { prisma } from '../../config/database.js';
import type { UpdateEmailSettingsInput } from './schema.js';

const TABLE = 'public.email_settings';

export async function getSettings() {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE id = 1`,
  );
  return rows[0] ?? null;
}

export async function updateSettings(input: UpdateEmailSettingsInput) {
  const map: Record<string, string> = {
    smtpHost: 'smtp_host', smtpPort: 'smtp_port', smtpSecure: 'smtp_secure',
    smtpUser: 'smtp_user', smtpPass: 'smtp_pass',
    fromInfo: 'from_info', fromOrder: 'from_order', fromSupport: 'from_support', fromName: 'from_name',
  };
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    const v = (input as Record<string, unknown>)[key];
    // smtpPass: only overwrite when a non-empty value is sent (blank = keep existing).
    if (key === 'smtpPass' && (v === undefined || v === '')) continue;
    if (v !== undefined) { set.push(`"${col}" = $${i++}`); values.push(v); }
  }
  if (set.length === 0) return getSettings();
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${set.join(', ')} WHERE id = 1 RETURNING *`,
    ...values,
  );
  return rows[0] ?? null;
}
