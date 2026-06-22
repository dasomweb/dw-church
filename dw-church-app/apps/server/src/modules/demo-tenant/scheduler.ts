import { DEMO_SLUG, restoreSnapshot, hasSnapshot } from './service.js';
import { cleanupExpiredDemoLogins } from './demo-login.js';

/**
 * In-process nightly reset of the demo tenant at 03:00 America/New_York (handles
 * EST/EDT automatically). A 60-second tick checks ET wall-clock; an in-memory
 * date guard prevents re-running the same day. restoreSnapshot is idempotent, so
 * even if two app instances both fire, the result is identical and harmless.
 *
 * Only DEMO_SLUG is ever touched — restoreSnapshot is hardcoded to it here.
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

async function tick(): Promise<void> {
  // Every minute: delete demo accounts whose 24h window has passed.
  try {
    const removed = await cleanupExpiredDemoLogins();
    if (removed > 0) console.log(`[demo-login] removed ${removed} expired demo account(s)`);
  } catch (err) {
    console.error('[demo-login] cleanup failed:', err);
  }

  const { date, hour, minute } = etNow();
  // 03:00–03:04 window; the date guard ensures it runs at most once per ET day.
  if (hour !== 3 || minute >= 5 || lastRunDate === date) return;
  lastRunDate = date;
  try {
    if (!(await hasSnapshot(DEMO_SLUG))) {
      console.log(`[demo-reset] ${date} — skipped, no snapshot for ${DEMO_SLUG} yet`);
      return;
    }
    const r = await restoreSnapshot(DEMO_SLUG);
    console.log(`[demo-reset] ${date} 03:00 ET — ${DEMO_SLUG} restored (${r.tables} tables)`);
  } catch (err) {
    console.error('[demo-reset] failed:', err);
  }
}

export function startDemoResetScheduler(): void {
  console.log(`[demo-reset] armed — ${DEMO_SLUG} resets nightly at 03:00 America/New_York`);
  setInterval(() => {
    void tick();
  }, 60_000);
}
