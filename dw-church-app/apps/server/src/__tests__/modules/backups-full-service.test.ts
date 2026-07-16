/**
 * Full-backup retention — pure selection logic. The IO paths (R2 dump/copy,
 * jsonb_populate_recordset restore) are exercised end-to-end against a real
 * tenant; this locks the rule that only NIGHTLY backups are pruned and only
 * beyond the newest `keep`.
 */
import { describe, it, expect } from 'vitest';
import { pickPrunableNightly } from '../../modules/backups-full/service.js';
import type { FullBackupMeta } from '../../modules/backups-full/service.js';

function meta(id: string, kind: FullBackupMeta['kind']): FullBackupMeta {
  return {
    snapshotId: id, slug: 'x', createdAt: `${id}`, kind, includesFiles: true,
    tableCount: 0, rowCount: 0, fileCount: 0, fileBytes: 0, note: null, createdBy: null, tenantRow: null,
  };
}

describe('pickPrunableNightly', () => {
  it('prunes nightly backups beyond the newest keep', () => {
    const metas = ['20260101-1', '20260102-1', '20260103-1', '20260104-1'].map((id) => meta(id, 'nightly'));
    // keep 2 → drop the 2 oldest
    expect(pickPrunableNightly(metas, 2).sort()).toEqual(['20260101-1', '20260102-1']);
  });

  it('never prunes manual / pre-delete / pre-build backups', () => {
    const metas = [
      meta('20260101-1', 'manual'),
      meta('20260102-1', 'pre-delete'),
      meta('20260103-1', 'pre-build'),
      meta('20260104-1', 'nightly'),
      meta('20260105-1', 'nightly'),
    ];
    expect(pickPrunableNightly(metas, 1)).toEqual(['20260104-1']); // only the older nightly
  });

  it('returns nothing when nightly count is within keep', () => {
    const metas = [meta('a', 'nightly'), meta('b', 'nightly')];
    expect(pickPrunableNightly(metas, 7)).toEqual([]);
  });

  it('is order-independent (selects by snapshotId, not input order)', () => {
    const metas = [meta('20260103-1', 'nightly'), meta('20260101-1', 'nightly'), meta('20260102-1', 'nightly')];
    expect(pickPrunableNightly(metas, 1).sort()).toEqual(['20260101-1', '20260102-1']);
  });
});
