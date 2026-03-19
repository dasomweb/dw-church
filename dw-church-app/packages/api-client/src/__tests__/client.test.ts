import { describe, it, expect, vi } from 'vitest';
import { DWChurchClient, DWChurchApiError } from '../client';
import { MockAdapter } from '../mock';
import type { Bulletin, PaginatedResponse, Sermon, Staff } from '../types';

// ─── Mock Data ───────────────────────────────────────────────
const mockBulletins: PaginatedResponse<Bulletin> = {
  data: [
    {
      id: 1,
      title: 'Weekly Bulletin',
      date: '2024-01-07',
      pdfUrl: 'https://example.com/bulletin.pdf',
      images: ['https://example.com/img1.jpg'],
      thumbnailUrl: 'https://example.com/thumb.jpg',
      status: 'publish',
      createdAt: '2024-01-07T00:00:00Z',
      modifiedAt: '2024-01-07T00:00:00Z',
    },
  ],
  total: 1,
  totalPages: 1,
  page: 1,
  perPage: 10,
};

const mockSermons: PaginatedResponse<Sermon> = {
  data: [
    {
      id: 10,
      title: 'Sunday Sermon',
      youtubeUrl: 'https://youtube.com/watch?v=abc123',
      scripture: 'John 3:16',
      preacher: 'Pastor Kim',
      date: '2024-01-07',
      thumbnailUrl: 'https://example.com/sermon-thumb.jpg',
      categoryIds: [1],
      category: 'Sunday',
      status: 'publish',
      createdAt: '2024-01-07T00:00:00Z',
      modifiedAt: '2024-01-07T00:00:00Z',
    },
  ],
  total: 1,
  totalPages: 1,
  page: 1,
  perPage: 10,
};

const mockStaff: Staff[] = [
  {
    id: 1,
    name: 'Pastor Kim',
    role: 'Senior Pastor',
    department: 'Ministry',
    email: 'pastor@example.com',
    phone: '010-1234-5678',
    bio: 'Lead pastor',
    order: 1,
    photoUrl: 'https://example.com/photo.jpg',
    snsLinks: { facebook: 'https://facebook.com/pastor' },
    isActive: true,
  },
];

// ─── Tests ───────────────────────────────────────────────────
describe('DWChurchClient', () => {
  describe('constructor', () => {
    it('creates client with baseUrl', () => {
      const client = new DWChurchClient({ baseUrl: 'https://example.com' });
      expect(client).toBeInstanceOf(DWChurchClient);
    });

    it('creates client with auth (Basic header)', () => {
      const client = new DWChurchClient({
        baseUrl: 'https://example.com',
        auth: { username: 'admin', password: 'secret' },
      });
      expect(client).toBeInstanceOf(DWChurchClient);
    });

    it('creates client with custom adapter', () => {
      const adapter = new MockAdapter();
      const client = new DWChurchClient({ baseUrl: 'https://example.com', adapter });
      expect(client).toBeInstanceOf(DWChurchClient);
    });
  });

  describe('with MockAdapter', () => {
    const adapter = new MockAdapter({
      '/dw-church/v1/bulletins': mockBulletins,
      '/dw-church/v1/sermons': mockSermons,
      '/dw-church/v1/staff': mockStaff,
      '/dw-church/v1/sermons/10/related': [mockSermons.data[0]],
    });
    const client = new DWChurchClient({ baseUrl: 'https://example.com', adapter });

    it('getBulletins returns paginated bulletins', async () => {
      const result = await client.getBulletins();
      expect(result).toEqual(mockBulletins);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Weekly Bulletin');
    });

    it('getSermons returns paginated sermons', async () => {
      const result = await client.getSermons();
      expect(result).toEqual(mockSermons);
      expect(result.data[0].preacher).toBe('Pastor Kim');
    });

    it('getStaff returns staff array', async () => {
      const result = await client.getStaff();
      expect(result).toEqual(mockStaff);
      expect(result[0].name).toBe('Pastor Kim');
    });

    it('getRelatedSermons calls the correct URL', async () => {
      const result = await client.getRelatedSermons(10);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Sunday Sermon');
    });
  });

  describe('getRelatedPosts', () => {
    it('constructs correct URL with params', async () => {
      const getSpy = vi.fn().mockResolvedValue([]);
      const adapter: any = {
        get: getSpy,
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      };
      const client = new DWChurchClient({ baseUrl: 'https://example.com', adapter });

      await client.getRelatedPosts({
        postType: 'sermon',
        currentId: 5,
        taxonomy: 'sermon_category',
        termIds: [1, 2, 3],
        limit: 6,
      });

      expect(getSpy).toHaveBeenCalledWith('/dw-church/v1/sermons/5/related', {
        taxonomy: 'sermon_category',
        term_ids: '1,2,3',
        limit: 6,
      });
    });

    it('uses default limit of 4 when not specified', async () => {
      const getSpy = vi.fn().mockResolvedValue([]);
      const adapter: any = {
        get: getSpy,
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      };
      const client = new DWChurchClient({ baseUrl: 'https://example.com', adapter });

      await client.getRelatedPosts({
        postType: 'bulletin',
        currentId: 1,
      });

      expect(getSpy).toHaveBeenCalledWith('/dw-church/v1/bulletins/1/related', {
        taxonomy: undefined,
        term_ids: undefined,
        limit: 4,
      });
    });
  });
});

describe('MockAdapter', () => {
  it('resolves exact URL match', async () => {
    const adapter = new MockAdapter({ '/test': { value: 42 } });
    const result = await adapter.get<{ value: number }>('/test');
    expect(result).toEqual({ value: 42 });
  });

  it('resolves prefix URL match', async () => {
    const adapter = new MockAdapter({ '/api/items': [1, 2, 3] });
    const result = await adapter.get<number[]>('/api/items/extra');
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns empty array for unmatched URL', async () => {
    const adapter = new MockAdapter({});
    const result = await adapter.get('/unknown');
    expect(result).toEqual([]);
  });

  it('setMockData adds data at runtime', async () => {
    const adapter = new MockAdapter({});
    adapter.setMockData('/dynamic', { added: true });
    const result = await adapter.get<{ added: boolean }>('/dynamic');
    expect(result).toEqual({ added: true });
  });

  it('post resolves data', async () => {
    const adapter = new MockAdapter({ '/create': { id: 1 } });
    const result = await adapter.post<{ id: number }>('/create', { name: 'test' });
    expect(result).toEqual({ id: 1 });
  });

  it('put resolves data', async () => {
    const adapter = new MockAdapter({ '/update': { updated: true } });
    const result = await adapter.put<{ updated: boolean }>('/update', {});
    expect(result).toEqual({ updated: true });
  });

  it('delete resolves data', async () => {
    const adapter = new MockAdapter({ '/delete': { deleted: true } });
    const result = await adapter.delete<{ deleted: boolean }>('/delete');
    expect(result).toEqual({ deleted: true });
  });
});

describe('DWChurchApiError', () => {
  it('has correct properties', () => {
    const error = new DWChurchApiError(404, 'Not Found', '{"message":"not found"}');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DWChurchApiError);
    expect(error.name).toBe('DWChurchApiError');
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.body).toBe('{"message":"not found"}');
    expect(error.message).toBe('DW Church API Error 404: Not Found');
  });

  it('has correct message for different status codes', () => {
    const error = new DWChurchApiError(500, 'Internal Server Error', '');
    expect(error.message).toBe('DW Church API Error 500: Internal Server Error');
  });
});
