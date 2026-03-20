import type {
  Album,
  ApiAdapter,
  AuthSession,
  AuthUser,
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
  LoginInput,
  MenuItem,
  Page,
  PageSection,
  PaginatedResponse,
  RegisterInput,
  RelatedPostsParams,
  Sermon,
  SermonListParams,
  Staff,
  StaffListParams,
  TaxonomyTerm,
  Theme,
  UploadedFile,
} from './types';

// ─── Default HTTP Adapter (fetch-based) ─────────────────────
class FetchAdapter implements ApiAdapter {
  private headers: Record<string, string>;

  constructor(
    private baseUrl: string,
    headers: Record<string, string> = {},
  ) {
    this.headers = { ...headers };
  }

  setHeader(key: string, value: string | null): void {
    if (value === null) {
      delete this.headers[key];
    } else {
      this.headers[key] = value;
    }
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const queryString = params ? this.buildQuery(params) : '';
    const fullUrl = `${this.baseUrl}${url}${queryString}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.headers,
    };

    // Remove Content-Type for FormData (let browser set boundary)
    if (data instanceof FormData) {
      delete headers['Content-Type'];
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: data
        ? data instanceof FormData
          ? data
          : JSON.stringify(data)
        : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new DWChurchApiError(response.status, response.statusText, errorBody);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const json = await response.json();

    // Handle paginated responses
    const totalHeader = response.headers.get('X-Total-Count');
    const totalPagesHeader = response.headers.get('X-Total-Pages');

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

// ─── Helper: convert ListParams to query params ──────────────
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
  private fetchAdapter?: FetchAdapter;
  private namespace = '/api/v1';

  constructor(config: ClientConfig) {
    if (config.adapter) {
      this.api = config.adapter;
    } else {
      const headers: Record<string, string> = {};
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }
      const adapter = new FetchAdapter(config.baseUrl, headers);
      this.fetchAdapter = adapter;
      this.api = adapter;
    }
  }

  /** Update the Bearer token at runtime (e.g. after login / refresh). */
  setToken(token: string): void {
    if (this.fetchAdapter) {
      this.fetchAdapter.setHeader('Authorization', `Bearer ${token}`);
    }
  }

  /** Clear the current auth token. */
  clearToken(): void {
    if (this.fetchAdapter) {
      this.fetchAdapter.setHeader('Authorization', null);
    }
  }

  // ─── Auth ────────────────────────────────────────────────
  async register(input: RegisterInput): Promise<AuthSession> {
    return this.api.post(`${this.namespace}/auth/register`, input);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    return this.api.post(`${this.namespace}/auth/login`, input);
  }

  async logout(): Promise<void> {
    return this.api.post(`${this.namespace}/auth/logout`);
  }

  async getMe(): Promise<AuthUser> {
    return this.api.get(`${this.namespace}/auth/me`);
  }

  async forgotPassword(email: string): Promise<void> {
    return this.api.post(`${this.namespace}/auth/forgot-password`, { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    return this.api.post(`${this.namespace}/auth/reset-password`, { token, password });
  }

  async invite(email: string, name: string, role: 'admin' | 'editor'): Promise<void> {
    return this.api.post(`${this.namespace}/auth/invite`, { email, name, role });
  }

  // ─── Bulletins ──────────────────────────────────────────
  async getBulletins(params?: ListParams): Promise<PaginatedResponse<Bulletin>> {
    return this.api.get(`${this.namespace}/bulletins`, toQueryParams(params));
  }

  async getBulletin(id: string): Promise<Bulletin> {
    return this.api.get(`${this.namespace}/bulletins/${id}`);
  }

  async createBulletin(data: Omit<Bulletin, 'id' | 'createdAt' | 'modifiedAt'>): Promise<Bulletin> {
    return this.api.post(`${this.namespace}/bulletins`, data);
  }

  async updateBulletin(id: string, data: Partial<Bulletin>): Promise<Bulletin> {
    return this.api.put(`${this.namespace}/bulletins/${id}`, data);
  }

  async deleteBulletin(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/bulletins/${id}`);
  }

  async getRelatedBulletins(id: string, limit = 4): Promise<Bulletin[]> {
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

  async getSermon(id: string): Promise<Sermon> {
    return this.api.get(`${this.namespace}/sermons/${id}`);
  }

  async createSermon(data: Omit<Sermon, 'id' | 'createdAt' | 'modifiedAt'>): Promise<Sermon> {
    return this.api.post(`${this.namespace}/sermons`, data);
  }

  async updateSermon(id: string, data: Partial<Sermon>): Promise<Sermon> {
    return this.api.put(`${this.namespace}/sermons/${id}`, data);
  }

  async deleteSermon(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/sermons/${id}`);
  }

  async getRelatedSermons(
    id: string,
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

  async getColumn(id: string): Promise<Column> {
    return this.api.get(`${this.namespace}/columns/${id}`);
  }

  async createColumn(data: Omit<Column, 'id' | 'createdAt' | 'modifiedAt'>): Promise<Column> {
    return this.api.post(`${this.namespace}/columns`, data);
  }

  async updateColumn(id: string, data: Partial<Column>): Promise<Column> {
    return this.api.put(`${this.namespace}/columns/${id}`, data);
  }

  async deleteColumn(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/columns/${id}`);
  }

  async getRelatedColumns(id: string, limit = 4): Promise<Column[]> {
    return this.api.get(`${this.namespace}/columns/${id}/related`, { limit });
  }

  // ─── Albums ─────────────────────────────────────────────
  async getAlbums(params?: ListParams): Promise<PaginatedResponse<Album>> {
    return this.api.get(`${this.namespace}/albums`, toQueryParams(params));
  }

  async getAlbum(id: string): Promise<Album> {
    return this.api.get(`${this.namespace}/albums/${id}`);
  }

  async createAlbum(data: Omit<Album, 'id' | 'createdAt' | 'modifiedAt'>): Promise<Album> {
    return this.api.post(`${this.namespace}/albums`, data);
  }

  async updateAlbum(id: string, data: Partial<Album>): Promise<Album> {
    return this.api.put(`${this.namespace}/albums/${id}`, data);
  }

  async deleteAlbum(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/albums/${id}`);
  }

  async getRelatedAlbums(id: string, limit = 4): Promise<Album[]> {
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

  async createBanner(data: Omit<Banner, 'id' | 'createdAt' | 'modifiedAt'>): Promise<Banner> {
    return this.api.post(`${this.namespace}/banners`, data);
  }

  async updateBanner(id: string, data: Partial<Banner>): Promise<Banner> {
    return this.api.put(`${this.namespace}/banners/${id}`, data);
  }

  async deleteBanner(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/banners/${id}`);
  }

  async getBanner(id: string): Promise<Banner> {
    return this.api.get(`${this.namespace}/banners/${id}`);
  }

  // ─── Events ─────────────────────────────────────────────
  async getEvents(params?: ListParams): Promise<PaginatedResponse<Event>> {
    return this.api.get(`${this.namespace}/events`, toQueryParams(params));
  }

  async getEvent(id: string): Promise<Event> {
    return this.api.get(`${this.namespace}/events/${id}`);
  }

  async createEvent(data: Omit<Event, 'id' | 'createdAt' | 'modifiedAt'>): Promise<Event> {
    return this.api.post(`${this.namespace}/events`, data);
  }

  async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
    return this.api.put(`${this.namespace}/events/${id}`, data);
  }

  async deleteEvent(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/events/${id}`);
  }

  async getRelatedEvents(id: string, limit = 4): Promise<Event[]> {
    return this.api.get(`${this.namespace}/events/${id}/related`, { limit });
  }

  // ─── Staff ──────────────────────────────────────────────
  async getStaff(params?: StaffListParams): Promise<Staff[]> {
    return this.api.get(`${this.namespace}/staff`, {
      department: params?.department,
      active_only: params?.activeOnly,
    });
  }

  async getStaffMember(id: string): Promise<Staff> {
    return this.api.get(`${this.namespace}/staff/${id}`);
  }

  async createStaff(data: Omit<Staff, 'id'>): Promise<Staff> {
    return this.api.post(`${this.namespace}/staff`, data);
  }

  async updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
    return this.api.put(`${this.namespace}/staff/${id}`, data);
  }

  async deleteStaff(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/staff/${id}`);
  }

  async reorderStaff(orderedIds: string[]): Promise<void> {
    return this.api.post(`${this.namespace}/staff/reorder`, { ids: orderedIds });
  }

  // ─── History ────────────────────────────────────────────
  async getHistory(params?: HistoryListParams): Promise<History[]> {
    return this.api.get(`${this.namespace}/history`, { year: params?.year });
  }

  async getHistoryEntry(id: string): Promise<History> {
    return this.api.get(`${this.namespace}/history/${id}`);
  }

  async getHistoryYears(): Promise<number[]> {
    return this.api.get(`${this.namespace}/history/years`);
  }

  async createHistory(data: Omit<History, 'id'>): Promise<History> {
    return this.api.post(`${this.namespace}/history`, data);
  }

  async updateHistory(id: string, data: Partial<History>): Promise<History> {
    return this.api.put(`${this.namespace}/history/${id}`, data);
  }

  async deleteHistory(id: string): Promise<void> {
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
    return this.api.get(`${this.namespace}/taxonomies/sermon_category`);
  }

  async getSermonPreachers(): Promise<TaxonomyTerm[]> {
    return this.api.get(`${this.namespace}/taxonomies/sermon_preacher`);
  }

  async getBannerCategories(): Promise<TaxonomyTerm[]> {
    return this.api.get(`${this.namespace}/taxonomies/banner_category`);
  }

  async getAlbumCategories(): Promise<TaxonomyTerm[]> {
    return this.api.get(`${this.namespace}/taxonomies/album_category`);
  }

  async getStaffDepartments(): Promise<TaxonomyTerm[]> {
    return this.api.get(`${this.namespace}/taxonomies/staff_department`);
  }

  // ─── Pages ──────────────────────────────────────────────
  async getPages(): Promise<Page[]> {
    return this.api.get(`${this.namespace}/pages`);
  }

  async getPage(slug: string): Promise<Page> {
    return this.api.get(`${this.namespace}/pages/${slug}`);
  }

  async createPage(data: Omit<Page, 'id' | 'sections'>): Promise<Page> {
    return this.api.post(`${this.namespace}/pages`, data);
  }

  async updatePage(id: string, data: Partial<Page>): Promise<Page> {
    return this.api.put(`${this.namespace}/pages/${id}`, data);
  }

  async deletePage(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/pages/${id}`);
  }

  // ─── Page Sections ──────────────────────────────────────
  async getPageSections(pageId: string): Promise<PageSection[]> {
    return this.api.get(`${this.namespace}/pages/${pageId}/sections`);
  }

  async createSection(pageId: string, data: Omit<PageSection, 'id' | 'pageId'>): Promise<PageSection> {
    return this.api.post(`${this.namespace}/pages/${pageId}/sections`, data);
  }

  async updateSection(pageId: string, sectionId: string, data: Partial<PageSection>): Promise<PageSection> {
    return this.api.put(`${this.namespace}/pages/${pageId}/sections/${sectionId}`, data);
  }

  async deleteSection(pageId: string, sectionId: string): Promise<void> {
    return this.api.delete(`${this.namespace}/pages/${pageId}/sections/${sectionId}`);
  }

  async reorderSections(pageId: string, orderedIds: string[]): Promise<void> {
    return this.api.post(`${this.namespace}/pages/${pageId}/sections/reorder`, { ids: orderedIds });
  }

  // ─── Menus ──────────────────────────────────────────────
  async getMenus(): Promise<MenuItem[]> {
    return this.api.get(`${this.namespace}/menus`);
  }

  async createMenu(data: Omit<MenuItem, 'id' | 'children'>): Promise<MenuItem> {
    return this.api.post(`${this.namespace}/menus`, data);
  }

  async updateMenu(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    return this.api.put(`${this.namespace}/menus/${id}`, data);
  }

  async deleteMenu(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/menus/${id}`);
  }

  async reorderMenus(orderedIds: string[]): Promise<void> {
    return this.api.post(`${this.namespace}/menus/reorder`, { ids: orderedIds });
  }

  // ─── Theme ──────────────────────────────────────────────
  async getTheme(): Promise<Theme> {
    return this.api.get(`${this.namespace}/theme`);
  }

  async updateTheme(data: Partial<Theme>): Promise<Theme> {
    return this.api.put(`${this.namespace}/theme`, data);
  }

  // ─── Users ────────────────────────────────────────────────
  async getUsers(): Promise<AuthUser[]> {
    return this.api.get(`${this.namespace}/users`);
  }

  async inviteUser(data: { email: string; name: string; role: 'admin' | 'editor' }): Promise<AuthUser> {
    return this.api.post(`${this.namespace}/users/invite`, data);
  }

  async removeUser(userId: string): Promise<void> {
    return this.api.delete(`${this.namespace}/users/${userId}`);
  }

  // ─── File Upload ────────────────────────────────────────
  async uploadFile(file: File): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post(`${this.namespace}/files`, formData);
  }

  async deleteFile(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/files/${id}`);
  }

  async getFiles(): Promise<UploadedFile[]> {
    return this.api.get(`${this.namespace}/files`);
  }
}
