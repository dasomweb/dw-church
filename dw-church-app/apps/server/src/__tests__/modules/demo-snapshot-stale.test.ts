/**
 * Demo-tenant snapshot staleness — pure logic that decides whether the super-admin
 * UI should warn "baseline edits will be wiped tonight, re-snapshot first".
 */
import { describe, it, expect } from 'vitest';
import { isSnapshotStale } from '../../modules/demo-tenant/snapshot-staleness.js';

describe('isSnapshotStale', () => {
  it('not stale when no super-admin edit has happened', () => {
    expect(isSnapshotStale('2026-06-24T00:00:00Z', null)).toBe(false);
  });

  it('not stale when no snapshot has been taken', () => {
    expect(isSnapshotStale(null, '2026-06-24T00:00:00Z')).toBe(false);
  });

  it('stale when a super-admin edit is newer than the snapshot', () => {
    expect(isSnapshotStale('2026-06-24T00:00:00Z', '2026-06-24T01:00:00Z')).toBe(true);
  });

  it('not stale when the snapshot is newer than (or equal to) the last edit', () => {
    expect(isSnapshotStale('2026-06-24T02:00:00Z', '2026-06-24T01:00:00Z')).toBe(false);
    expect(isSnapshotStale('2026-06-24T01:00:00Z', '2026-06-24T01:00:00Z')).toBe(false);
  });

  it('accepts Date objects as well as ISO strings', () => {
    expect(isSnapshotStale(new Date('2026-06-24T00:00:00Z'), new Date('2026-06-24T00:00:01Z'))).toBe(true);
  });
});
