/**
 * Export service tests — generic table enumeration, image-URL harvesting,
 * bigint/Date normalization, and archive metadata.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryRawUnsafe = vi.fn();
vi.mock('../../config/database.js', () => ({
  prisma: { $queryRawUnsafe: (...a: unknown[]) => queryRawUnsafe(...a) },
}));

const { exportTenant } = await import('../../modules/export/service.js');

beforeEach(() => {
  queryRawUnsafe.mockReset();
});

describe('exportTenant', () => {
  it('enumerates tenant tables and dumps every row', async () => {
    queryRawUnsafe.mockImplementation((sql: string) => {
      if (sql.includes('information_schema.tables')) {
        return Promise.resolve([{ table_name: 'sermons' }, { table_name: 'staff' }]);
      }
      if (sql.includes('"sermons"')) {
        return Promise.resolve([
          { id: 1, title: '말씀', thumbnail_url: 'https://cdn.truelight.app/tenant_grace/a.jpg' },
        ]);
      }
      if (sql.includes('"staff"')) {
        return Promise.resolve([{ id: 1, name: '김목사', photo: 'https://cdn.truelight.app/tenant_grace/p.png' }]);
      }
      return Promise.resolve([]);
    });

    const archive = await exportTenant('grace', 'Grace Church', 'pro', '2026-06-16T00:00:00.000Z');

    expect(archive.meta.slug).toBe('grace');
    expect(archive.meta.plan).toBe('pro');
    expect(archive.meta.schema).toBe('tenant_grace');
    expect(archive.meta.tableCount).toBe(2);
    expect(archive.meta.rowCount).toBe(2);
    expect(Object.keys(archive.tables)).toEqual(['sermons', 'staff']);
    expect(archive.tables.sermons).toHaveLength(1);
  });

  it('harvests image/pdf URLs into a deduped sorted manifest', async () => {
    queryRawUnsafe.mockImplementation((sql: string) => {
      if (sql.includes('information_schema.tables')) {
        return Promise.resolve([{ table_name: 'pages' }]);
      }
      return Promise.resolve([
        {
          id: 1,
          props: {
            hero: 'https://cdn.truelight.app/tenant_grace/b.webp',
            link: 'https://example.com/about', // not an asset → excluded
            gallery: ['https://cdn.truelight.app/tenant_grace/a.jpg', 'https://cdn.truelight.app/tenant_grace/a.jpg'],
            pdf: 'https://cdn.truelight.app/tenant_grace/bulletin.pdf?v=2',
          },
        },
      ]);
    });

    const archive = await exportTenant('grace', 'Grace', 'light', '2026-06-16T00:00:00.000Z');

    expect(archive.images).toEqual([
      'https://cdn.truelight.app/tenant_grace/a.jpg',
      'https://cdn.truelight.app/tenant_grace/b.webp',
      'https://cdn.truelight.app/tenant_grace/bulletin.pdf?v=2',
    ]);
    expect(archive.images).not.toContain('https://example.com/about');
    expect(archive.meta.imageCount).toBe(3);
  });

  it('coerces bigint and Date so the archive is JSON-serializable', async () => {
    queryRawUnsafe.mockImplementation((sql: string) => {
      if (sql.includes('information_schema.tables')) {
        return Promise.resolve([{ table_name: 'events' }]);
      }
      return Promise.resolve([{ id: 7n, created_at: new Date('2026-01-02T03:04:05.000Z') }]);
    });

    const archive = await exportTenant('grace', 'Grace', 'basic', '2026-06-16T00:00:00.000Z');
    const row = (archive.tables.events as Record<string, unknown>[])[0]!;
    expect(row.id).toBe(7);
    expect(row.created_at).toBe('2026-01-02T03:04:05.000Z');
    // The whole thing must stringify without throwing on bigint.
    expect(() => JSON.stringify(archive)).not.toThrow();
  });
});
