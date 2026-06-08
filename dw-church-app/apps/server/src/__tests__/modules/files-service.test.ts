/**
 * Files service tests — pins the reference-photo support added for the
 * super-admin 참조 사진 page + the AI builder (files.kind / tags).
 *
 * upload() must persist kind/tags/description so kind='reference' rows are
 * discoverable; listFiles() must filter by kind when asked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/database.js', () => ({
  prisma: { $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));
vi.mock('../../config/r2.js', () => ({
  uploadFile: vi.fn(async () => 'https://cdn.example/test.webp'),
  deleteFile: vi.fn(async () => undefined),
}));

const { upload, listFiles } = await import('../../modules/files/service.js');
const { prisma } = await import('../../config/database.js');

beforeEach(() => {
  vi.mocked(prisma.$queryRawUnsafe).mockReset();
  vi.mocked(prisma.$executeRawUnsafe).mockReset();
});

describe('upload — reference photo', () => {
  it('persists kind, tags and description', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([{ id: 'f1', url: 'https://cdn.example/test.webp', kind: 'reference' }] as never);

    await upload({
      tenantSlug: 'grace',
      schema: 'tenant_grace',
      entityType: 'reference',
      filename: 'sanctuary.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.from('x'),
      kind: 'reference',
      tags: ['예배당', '성도'],
      description: '본당 전경',
    });

    const [sql, ...args] = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0]!;
    expect(String(sql)).toMatch(/INSERT INTO "tenant_grace"\.files/);
    expect(String(sql)).toMatch(/kind/);
    expect(String(sql)).toMatch(/tags/);
    // params order: name, key, url, contentType, size, entity_type, kind, tags, description
    expect(args).toContain('reference');
    expect(args).toContainEqual(['예배당', '성도']);
    expect(args).toContain('본당 전경');
  });

  it('defaults kind to "upload" when not a reference', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([{ id: 'f2', url: 'u' }] as never);
    await upload({
      tenantSlug: 'grace', schema: 'tenant_grace', entityType: 'general',
      filename: 'a.png', contentType: 'image/png', buffer: Buffer.from('x'),
    });
    const args = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0]!.slice(1);
    expect(args).toContain('upload');
  });
});

describe('listFiles — kind filter', () => {
  it('adds an AND kind = filter and passes the value', async () => {
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([] as never)        // rows
      .mockResolvedValueOnce([{ total: 0 }] as never); // count

    await listFiles('tenant_grace', { page: 1, perPage: 20, kind: 'reference' });

    const [sql, ...args] = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0]!;
    expect(String(sql)).toMatch(/AND kind = \$/);
    expect(args).toContain('reference');
  });

  it('omits the kind filter when not provided', async () => {
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 0 }] as never);

    await listFiles('tenant_grace', { page: 1, perPage: 20 });

    const [sql] = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0]!;
    expect(String(sql)).not.toMatch(/AND kind = /);
  });
});
