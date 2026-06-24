/**
 * Pure staleness check (no DB imports, so it is trivially unit-testable).
 *
 * The demo-tenant snapshot is "stale" when a super-admin edited the tenant AFTER
 * the last capture — those baseline edits get wiped by the next nightly restore
 * unless a fresh snapshot is taken. last_admin_edit_at is stamped by edit-tracker.ts
 * for super-admin writes only (ordinary demo testers' edits are meant to be wiped
 * and must not flag the snapshot stale).
 */
export function isSnapshotStale(
  takenAt: Date | string | null,
  lastAdminEditAt: Date | string | null,
): boolean {
  if (!takenAt || !lastAdminEditAt) return false;
  return new Date(lastAdminEditAt).getTime() > new Date(takenAt).getTime();
}
