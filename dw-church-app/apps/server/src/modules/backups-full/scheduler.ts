import { prisma } from '../../config/database.js';
import { DEMO_SLUG } from '../demo-tenant/service.js';
import { createFullBackup, pruneNightly, isBackupConfigured } from './service.js';

/**
 * Nightly full backup of every active tenant at 03:30 America/New_York (30 min
 * after the demo reset so they don't overlap). DB + media, keeping the newest 7
 * nightly snapshots per tenant. The demo tenant is excluded — it's reset nightly
 * from its own golden snapshot, so backing it up is pointless.
 *
 * Same 60-second-tick + ET-date-guard pattern as the demo reset scheduler, so a
 * single ET day fires at most once even across restarts within the window.
 */
let lastRunDate: string | null = null;

function etNow(): { date: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value])) as Record<string, string>;
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, minute: Number(p.minute) };
}

async function runNightlyBackups(date: string): Promise<void> {
  const tenants = await prisma.tenant.findMany({ where: { isActive: true }, select: { slug: true } });
  let ok = 0;
  for (const { slug } of tenants) {
    if (slug === DEMO_SLUG) continue;
    try {
      const meta = await createFullBackup(slug, { kind: 'nightly', includeFiles: true, note: `야간 자동 백업 ${date}` });
      await pruneNightly(slug, 7);
      ok++;
      console.log(`[nightly-backup] ${date} — ${slug}: ${meta.tableCount} tables / ${meta.rowCount} rows / ${meta.fileCount} files`);
    } catch (err) {
      console.error(`[nightly-backup] ${date} — ${slug} FAILED:`, err);
    }
  }
  console.log(`[nightly-backup] ${date} — done (${ok}/${tenants.length} tenants)`);
}

async function tick(): Promise<void> {
  const { date, hour, minute } = etNow();
  // 03:30–03:34 window; the date guard runs it at most once per ET day.
  if (hour !== 3 || minute < 30 || minute >= 35 || lastRunDate === date) return;
  lastRunDate = date;
  try {
    await runNightlyBackups(date);
  } catch (err) {
    console.error('[nightly-backup] failed:', err);
  }
}

export function startNightlyBackupScheduler(): void {
  if (!isBackupConfigured()) {
    console.log('[nightly-backup] disabled — R2_BACKUP_BUCKET_NAME not set');
    return;
  }
  console.log('[nightly-backup] armed — active tenants back up nightly at 03:30 America/New_York (keep 7)');
  setInterval(() => { void tick(); }, 60_000);
}
