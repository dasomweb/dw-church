/**
 * Tenant backup service — pure helpers (schema-name construction + retention
 * selection). The DB-touching create/restore/delete paths are covered by the
 * demo-tenant snapshot machinery they generalize; these tests lock the two
 * bits of pure logic that guard identifier safety and retention.
 */
import { describe, it, expect } from 'vitest';
import { buildBackupSchemaName, selectPrunable } from '../../modules/backups/service.js';

describe('buildBackupSchemaName', () => {
  it('produces a valid, uniquely-suffixed tenant backup schema name', () => {
    const name = buildBackupSchemaName('lagrangechurch');
    expect(name).toMatch(/^tenant_lagrangechurch_b_[a-z0-9]+$/);
    expect(name.length).toBeLessThanOrEqual(63); // Postgres identifier limit
  });

  it('generates distinct names on repeated calls', () => {
    const a = buildBackupSchemaName('dasom');
    const b = buildBackupSchemaName('dasom');
    expect(a).not.toBe(b);
  });

  it('rejects an unsafe slug', () => {
    expect(() => buildBackupSchemaName('bad slug!')).toThrow();
  });
});

describe('selectPrunable', () => {
  const ids = Array.from({ length: 25 }, (_, i) => i); // newest-first indices 0..24

  it('keeps the newest N and returns the rest for pruning', () => {
    const prune = selectPrunable(ids, 20);
    expect(prune).toEqual([20, 21, 22, 23, 24]); // oldest 5 dropped
  });

  it('returns nothing to prune when under the cap', () => {
    expect(selectPrunable([1, 2, 3], 20)).toEqual([]);
  });
});
