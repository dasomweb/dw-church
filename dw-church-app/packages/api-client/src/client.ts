import type {
  Album,
  ApiAdapter,
  Banner,
  BannerListParams,
  Bulletin,
  ChurchSettings,
  ClientConfig,
  Column,
  Event,
  History,
  HistoryListParams,
  ListParams,
  PaginatedResponse,
  RelatedPostsParams,
  Sermon,
  SermonListParams,
  Staff,
  StaffListParams,
  TaxonomyTerm,
} from './types';

// ─── Default HTTP Adapter (fetch-based) ─────────────────────
class FetchAdapter implements ApiAdapter {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string> = {},
  ) {}

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const queryString = params ? this.buildQuery(params) : '';
    const fullUrl = `${this.baseUrl}${url}${queryString}`;

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new DWChurchApiError(response.status, response.statusText, errorBody);
    }

    // Handle paginated responses
    const totalHeader = response.headers.get('X-WP-Total');
    const totalPagesHeader = response.headers.get('X-WP-TotalPages');
    const json = await response.json();

    if (totalHeader && totalPagesHeader) {
      return {
        data: json,
        total: parseInt(totalHeader, 10),
        totalPages: parseInt(totalPagesHeader, 10),
        page: (params?.['page'] as number) ?? 1,
        perPage: (params?.['per_page'] as number) ?? 10,
      } as T;
    }

    return json as T;
  }

  private buildQuery(params: Record<string, unknown>): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (entries.length === 0) return '';
    const searchParams = new URLSearchParams();
    for (const [key, value] of entries) {
      searchParams.set(key, String(value));
    }
    return `?${searchParams.toString()}`;
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', url, undefined, params);
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', url, data);
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', url, data);
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }
}

// ─── API Error ──────────────────────────────────────────────
export class DWChurchApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
  ) {
    super(`DW Church API Error ${status}: ${statusText}`);
    this.name = 'DWChurchApiError';
  }
}

// ─── Helper: convert ListParams to WP REST API query params ─
function toQueryParams(params?: ListParams): Record<string, unknown> {
  if (!params) return {};
  return {
    page: params.page,
    per_page: params.perPage,
    search: params.search,
    orderby: params.orderBy,
    order: params.order,
    status: params.status,
  };
}

// ─── Main Client ────────────────────────────────────────────
export class DWChurchClient {
  private api: ApiAdapter;
  private namespace = '/dw-church/v1';

  constructor(config: ClientConfig) {
    if (config.adapter) {
      this.api = config.adapter;
    } else {
      const headers: Record<string, string> = {};
      if (config.auth) {
        const encoded = btoa(`${config.auth.username}:${config.auth.password}`);
        headers['Authorization'] = `Basic ${encoded}`;
      }
      this.api = new FetchAdapter(config.baseUrl, headers);
    }
  }

  // ─── Bulletins ──────────────────────────────────────────
  async getBulletins(params?: ListParams): Promise<PaginatedResponse<Bulletin>> {
    return this.api.get(`${this.namespace}/bulletins`, toQueryParams(params));
  }

  async getBulletin(id: number): Promise<Bulletin> {
    return this.api.get(`${this.namespace}/bulletins/${id}`);
  }

  async getRelatedBulletins(id: number, limit = 4): Promise<Bulletin[]> {
    return this.api.get(`${this.namespace}/bulletins/${id}/related`, { limit });
  }

  // ─── Sermons ────────────────────────────────────────────
  async getSermons(params?: SermonListParams): Promise<PaginatedResponse<Sermon>> {
    const query = {
      ...toQueryParams(params),
      category: params?.category,
      preacher: params?.preacher,
    };
    return this.api.get(`${this.namespace}/sermons`, query);
  }

  async getSermon(id: number): Promise<Sermon> {
    return this.api.get(`${this.namespace}/sermons/${id}`);
  }

  async getRelatedSermons(
    id: number,
    options?: { taxonomy?: string; limit?: number },
  ): Promise<Sermon[]> {
    return this.api.get(`${this.namespace}/sermons/${id}/related`, {
      taxonomy: options?.taxonomy ?? 'sermon_category',
      limit: options?.limit ?? 4,
    });
  }

  // ─── Columns ────────────────────────────────────────────
  async getColumns(params?: ListParams): Promise<PaginatedResponse<Column>> {
    return this.api.get(`${this.namespace}/columns`, toQueryParams(params));
  }

  async getColumn(id: number): Promise<Column> {
    return this.api.get(`${this.namespace}/columns/${id}`);
  }

  async getRelatedColumns(id: number, limit = 4): Promise<Column[]> {
    return this.api.get(`${this.namespace}/columns/${id}/related`, { limit });
  }

  // ─── Albums ─────────────────────────────────────────────
  async getAlbums(params?: ListParams): Promise<PaginatedResponse<Album>> {
    return this.api.get(`${this.namespace}/albums`, toQueryParams(params));
  }

  async getAlbum(id: number): Promise<Album> {
    return this.api.get(`${this.namespace}/albums/${id}`);
  }

  async getRelatedAlbums(id: number, limit = 4): Promise<Album[]> {
    return this.api.get(`${this.namespace}/albums/${id}/related`, { limit });
  }

  // ─── Banners ────────────────────────────────────────────
  async getBanners(params?: BannerListParams): Promise<PaginatedResponse<Banner>> {
    const query = {
      ...toQueryParams(params),
      category: params?.category,
      active: params?.active,
    };
    return this.api.get(`${this.namespace}/banners`, query);
  }

  async getBanner(id: number): Promise<Banner> {
    return this.api.get(`${this.namespace}/banners/${id}`);
  }

  // ─── Events ─────────────────────────────────────────────
  async getEvents(params?: ListParams): Promise<PaginatedResponse<Event>> {
    return this.api.get(`${this.namespace}/events`, toQueryParams(params));
  }

  async getEvent(id: number): Promise<Event> {
    return this.api.get(`${this.namespace}/events/${id}`);
  }

  async getRelatedEvents(id: number, limit = 4): Promise<Event[]> {
    return this.api.get(`${this.namespace}/events/${id}/related`, { limit });
  }

  // ─── Staff ──────────────────────────────────────────────
  async getStaff(params?: StaffListParams): Promise<Staff[]> {
    return this.api.get(`${this.namespace}/staff`, {
      department: params?.department,
      active_only: params?.activeOnly,
    });
  }

  async getStaffMember(id: number): Promise<Staff> {
    return this.api.get(`${this.namespace}/staff/${id}`);
  }

  async createStaff(data: Omit<Staff, 'id'>): Promise<Staff> {
    return this.api.post(`${this.namespace}/staff`, data);
  }

  async updateStaff(id: number, data: Partial<Staff>): Promise<Staff> {
    return this.api.put(`${this.namespace}/staff/${id}`, data);
  }

  async deleteStaff(id: number): Promise<void> {
    return this.api.delete(`${this.namespace}/staff/${id}`);
  }

  async reorderStaff(orderedIds: number[]): Promise<void> {
    return this.api.post(`${this.namespace}/staff/reorder`, { ids: orderedIds });
  }

  // ─── History ────────────────────────────────────────────
  async getHistory(params?: HistoryListParams): Promise<History[]> {
    return this.api.get(`${this.namespace}/history`, { year: params?.year });
  }

  async getHistoryEntry(id: number): Promise<History> {
    return this.api.get(`${this.namespace}/history/${id}`);
  }

  async getHistoryYears(): Promise<number[]> {
    return this.api.get(`${this.namespace}/history/years`);
  }

  async createHistory(data: Omit<History, 'id'>): Promise<History> {
    return this.api.post(`${this.namespace}/history`, data);
  }

  async updateHistory(id: number, data: Partial<History>): Promise<History> {
    return this.api.put(`${this.namespace}/history/${id}`, data);
  }

  async deleteHistory(id: number): Promise<void> {
    return this.api.delete(`${this.namespace}/history/${id}`);
  }

  // ─── Settings ───────────────────────────────────────────
  async getSettings(): Promise<ChurchSettings> {
    return this.api.get(`${this.namespace}/settings`);
  }

  async updateSettings(data: Partial<ChurchSettings>): Promise<ChurchSettings> {
    return this.api.post(`${this.namespace}/settings`, data);
  }

  // ─── Related Posts (generic) ────────────────────────────
  async getRelatedPosts<T>(params: RelatedPostsParams): Promise<T[]> {
    const { postType, currentId, taxonomy, termIds, limit } = params;
    return this.api.get(`${this.namespace}/${postType}s/${currentId}/related`, {
      taxonomy,
      term_ids: termIds?.join(','),
      limit: limit ?? 4,
    });
  }

  // ─── Taxonomies ─────────────────────────────────────────
  async getSermonCategories(): Promise<TaxonomyTerm[]> {
    return this.api.get('/wp/v2/sermon_category');
  }

  async getSermonPreachers(): Promise<TaxonomyTerm[]> {
    return this.api.get('/wp/v2/dw_sermon_preacher');
  }

  async getBannerCategories(): Promise<TaxonomyTerm[]> {
    return this.api.get('/wp/v2/banner_category');
  }

  async getAlbumCategories(): Promise<TaxonomyTerm[]> {
    return this.api.get('/wp/v2/album_category');
  }

  async getStaffDepartments(): Promise<TaxonomyTerm[]> {
    return this.api.get('/wp/v2/dw_staff_department');
  }
}
