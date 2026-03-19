import { describe, it, expect } from 'vitest';
import type {
  Bulletin,
  Sermon,
  Column,
  Album,
  Banner,
  BannerTextOverlay,
  BannerPosition,
  BannerAlign,
  BannerCategory,
  LinkTarget,
  Event,
  Staff,
  StaffSnsLinks,
  History,
  HistoryItem,
  ChurchSettings,
  PostStatus,
  PostType,
  PaginatedResponse,
  ListParams,
  SermonListParams,
  BannerListParams,
  StaffListParams,
  HistoryListParams,
  RelatedPostsParams,
  TaxonomyTerm,
  AuthConfig,
  ClientConfig,
  ApiAdapter,
} from '../types';

// These tests verify that types are structurally correct by creating
// mock objects conforming to each interface. If the types change in
// incompatible ways, TypeScript compilation of the tests will fail.

describe('Type exports - compile-time structure checks', () => {
  it('Bulletin has expected shape', () => {
    const bulletin: Bulletin = {
      id: 1,
      title: 'Test Bulletin',
      date: '2024-01-01',
      pdfUrl: 'https://example.com/test.pdf',
      images: ['https://example.com/img.jpg'],
      thumbnailUrl: 'https://example.com/thumb.jpg',
      status: 'publish',
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
    };
    expect(bulletin.id).toBe(1);
    expect(bulletin.status).toBe('publish');
  });

  it('Sermon has expected shape', () => {
    const sermon: Sermon = {
      id: 2,
      title: 'Test Sermon',
      youtubeUrl: 'https://youtube.com/watch?v=test',
      scripture: 'Genesis 1:1',
      preacher: 'Pastor Lee',
      date: '2024-01-07',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      categoryIds: [1, 2],
      category: 'Sunday',
      status: 'publish',
      createdAt: '2024-01-07T00:00:00Z',
      modifiedAt: '2024-01-07T00:00:00Z',
    };
    expect(sermon.preacher).toBe('Pastor Lee');
    expect(sermon.categoryIds).toHaveLength(2);
  });

  it('Column has expected shape', () => {
    const column: Column = {
      id: 3,
      title: 'Pastoral Column',
      content: '<p>Column content</p>',
      topImageUrl: '',
      bottomImageUrl: '',
      youtubeUrl: '',
      thumbnailUrl: '',
      status: 'draft',
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
    };
    expect(column.content).toContain('Column content');
  });

  it('Album has expected shape', () => {
    const album: Album = {
      id: 4,
      title: 'Photo Album',
      images: ['img1.jpg', 'img2.jpg'],
      youtubeUrl: '',
      thumbnailUrl: 'thumb.jpg',
      categoryIds: [1],
      status: 'publish',
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
    };
    expect(album.images).toHaveLength(2);
  });

  it('Banner and related types have expected shape', () => {
    const textOverlay: BannerTextOverlay = {
      heading: 'Welcome',
      subheading: 'To Our Church',
      description: 'Join us',
      position: 'center-center' as BannerPosition,
      align: 'center' as BannerAlign,
      widths: { pc: '60%', laptop: '70%', tablet: '80%', mobile: '100%' },
    };
    const banner: Banner = {
      id: 5,
      title: 'Main Banner',
      pcImageUrl: 'pc.jpg',
      mobileImageUrl: 'mobile.jpg',
      subImageUrl: 'sub.jpg',
      linkUrl: 'https://example.com',
      linkTarget: '_blank' as LinkTarget,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      textOverlay,
      category: 'main' as BannerCategory,
      status: 'publish',
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
    };
    expect(banner.textOverlay.position).toBe('center-center');
    expect(banner.linkTarget).toBe('_blank');
  });

  it('Event has expected shape', () => {
    const event: Event = {
      id: 6,
      title: 'Church Event',
      backgroundImageUrl: 'bg.jpg',
      imageOnly: false,
      department: 'Youth',
      eventDate: '2024-03-15',
      location: 'Main Hall',
      linkUrl: '',
      description: 'Annual youth retreat',
      youtubeUrl: '',
      thumbnailUrl: 'thumb.jpg',
      status: 'publish',
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
    };
    expect(event.department).toBe('Youth');
  });

  it('Staff and StaffSnsLinks have expected shape', () => {
    const snsLinks: StaffSnsLinks = {
      facebook: 'https://facebook.com/test',
      instagram: 'https://instagram.com/test',
    };
    const staff: Staff = {
      id: 7,
      name: 'John Doe',
      role: 'Youth Pastor',
      department: 'Youth Ministry',
      email: 'john@example.com',
      phone: '010-0000-0000',
      bio: 'Bio text',
      order: 1,
      photoUrl: 'photo.jpg',
      snsLinks,
      isActive: true,
    };
    expect(staff.snsLinks.facebook).toBeDefined();
    expect(staff.isActive).toBe(true);
  });

  it('History and HistoryItem have expected shape', () => {
    const item: HistoryItem = {
      id: 'item-1',
      month: 3,
      day: 15,
      content: 'Church founded',
      photoUrl: 'photo.jpg',
    };
    const history: History = {
      id: 1,
      year: 2020,
      items: [item],
    };
    expect(history.items[0].month).toBe(3);
  });

  it('ChurchSettings has expected shape', () => {
    const settings: ChurchSettings = {
      name: 'DW Church',
      address: '123 Main St',
      phone: '02-1234-5678',
      email: 'info@church.com',
      website: 'https://church.com',
      socialYoutube: '',
      socialInstagram: '',
      socialFacebook: '',
      socialLinkedin: '',
      socialTiktok: '',
      socialKakaotalk: '',
      socialKakaotalkChannel: '',
    };
    expect(settings.name).toBe('DW Church');
  });

  it('PostStatus and PostType are valid string literals', () => {
    const status: PostStatus = 'publish';
    const type: PostType = 'sermon';
    expect(status).toBe('publish');
    expect(type).toBe('sermon');
  });

  it('PaginatedResponse wraps data with pagination info', () => {
    const response: PaginatedResponse<{ id: number }> = {
      data: [{ id: 1 }],
      total: 1,
      totalPages: 1,
      page: 1,
      perPage: 10,
    };
    expect(response.data).toHaveLength(1);
    expect(response.total).toBe(1);
  });

  it('ListParams and extensions have expected shape', () => {
    const params: ListParams = { page: 1, perPage: 10, search: 'test', order: 'desc' };
    const sermonParams: SermonListParams = { ...params, category: 'Sunday', preacher: 1 };
    const bannerParams: BannerListParams = { ...params, category: 'main', active: true };
    const staffParams: StaffListParams = { ...params, department: 'Youth', activeOnly: true };
    const historyParams: HistoryListParams = { year: 2024 };

    expect(params.page).toBe(1);
    expect(sermonParams.category).toBe('Sunday');
    expect(bannerParams.active).toBe(true);
    expect(staffParams.activeOnly).toBe(true);
    expect(historyParams.year).toBe(2024);
  });

  it('RelatedPostsParams has expected shape', () => {
    const params: RelatedPostsParams = {
      postType: 'sermon',
      currentId: 1,
      taxonomy: 'sermon_category',
      termIds: [1, 2],
      limit: 6,
    };
    expect(params.termIds).toHaveLength(2);
  });

  it('TaxonomyTerm has expected shape', () => {
    const term: TaxonomyTerm = {
      id: 1,
      name: 'Sunday Sermon',
      slug: 'sunday-sermon',
      count: 42,
      parentId: undefined,
    };
    expect(term.slug).toBe('sunday-sermon');
  });

  it('AuthConfig has expected shape', () => {
    const auth: AuthConfig = { username: 'admin', password: 'password' };
    expect(auth.username).toBe('admin');
  });

  it('ClientConfig has expected shape', () => {
    const config: ClientConfig = {
      baseUrl: 'https://example.com',
      auth: { username: 'admin', password: 'pass' },
    };
    expect(config.baseUrl).toBe('https://example.com');
  });

  it('ApiAdapter interface can be implemented', () => {
    const adapter: ApiAdapter = {
      get: async () => ({} as any),
      post: async () => ({} as any),
      put: async () => ({} as any),
      delete: async () => ({} as any),
    };
    expect(adapter.get).toBeDefined();
    expect(adapter.post).toBeDefined();
    expect(adapter.put).toBeDefined();
    expect(adapter.delete).toBeDefined();
  });
});
