import type {
  Album,
  ApiAdapter,
  AuthSession,
  AuthUser,
  Banner,
  BannerListParams,
  Board,
  BoardPost,
  Bulletin,
  Category,
  Cell,
  ChurchSettings,
  ClientConfig,
  Column,
  Event,
  History,
  Newcomer,
  NewcomerStatus,
  NewcomerSubmission,
  FormSubmission,
  FormSubmissionStatus,
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
  TemplatePreset,
  Theme,
  UploadedFile,
  Video,
  VideoCategory,
  VideoListParams,
  Schedule,
  ScheduleListParams,
} from './types';

// ─── Default HTTP Adapter (fetch-based) ─────────────────────
// snake_case → camelCase converter for API responses
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), camelizeKeys(v)])
    );
  }
  return obj;
}

// Unwrap the server's `{ data: T }` envelope — some endpoints return the bare
// payload, others wrap it. Generic so T is inferred from the caller's return
// type (return unwrapData(res) inside a `Promise<Staff[]>` method → T=Staff[]),
// keeping every call site annotation-free and type-safe.
function unwrapData<T>(res: unknown): T {
  if (res !== null && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

// The sermons API returns preacher_name / sermon_date / categories[] (camelized
// to preacherName / sermonDate / categories), but the typed Sermon shape uses
// preacher / date / categoryIds. Normalize here — without this the admin edit
// form reads item.preacher / item.date / item.categoryIds as undefined and the
// 설교자·날짜 fields load blank (looks like the save didn't stick).
function mapSermon(raw: unknown): Sermon {
  const r = (raw ?? {}) as Record<string, unknown>;
  const categories = Array.isArray(r.categories) ? (r.categories as Array<{ id?: string }>) : [];
  return {
    ...r,
    preacher: (r.preacher as string) ?? (r.preacherName as string) ?? '',
    date: (r.date as string) ?? (r.sermonDate as string) ?? '',
    category: (r.category as string) ?? '',
    categoryIds: (r.categoryIds as string[]) ?? categories.map((c) => c.id).filter(Boolean),
  } as Sermon;
}

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
      ...this.headers,
    };

    // Only set Content-Type when there's a body (not for DELETE without body)
    if (data) {
      if (data instanceof FormData) {
        // Let browser set boundary for FormData
      } else {
        headers['Content-Type'] = 'application/json';
      }
    } else if (method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }

    // Server Zod schemas accept camelCase. We used to snakeize on send, but
    // that broke any required camelCase field (e.g. createSection.blockType)
    // because Zod couldn't find the field under its snake_case alias. Send
    // the camelCase payload as-is; incoming responses are still camelized.
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

    const rawJson = await response.json();
    const json = camelizeKeys(rawJson);

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

  /**
   * Raw GET that returns the response body as a Blob with NO key camelization.
   * Used for file downloads (e.g. /export) where the payload is an opaque
   * archive and rewriting its keys would corrupt it.
   */
  async getBlob(url: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'GET',
      headers: { ...this.headers },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new DWChurchApiError(response.status, response.statusText, errorBody);
    }
    return response.blob();
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

  /** Raw adapter for ad-hoc requests (e.g. AI endpoints without a typed method). */
  get adapter(): ApiAdapter {
    return this.api;
  }

  constructor(config: ClientConfig) {
    if (config.adapter) {
      this.api = config.adapter;
    } else {
      const headers: Record<string, string> = {};
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }
      if (config.tenantSlug) {
        headers['X-Tenant-Slug'] = config.tenantSlug;
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

  /** Update the tenant slug header at runtime. */
  setTenantSlug(slug: string): void {
    if (this.fetchAdapter) {
      this.fetchAdapter.setHeader('X-Tenant-Slug', slug);
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

  async refreshToken(token: string): Promise<AuthSession> {
    return this.api.post(`${this.namespace}/auth/refresh`, { refreshToken: token });
  }

  async logout(): Promise<void> {
    return this.api.post(`${this.namespace}/auth/logout`);
  }

  async getMe(): Promise<AuthUser> {
    return this.api.get(`${this.namespace}/auth/me`);
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<AuthUser> {
    return this.api.put(`${this.namespace}/auth/me`, data);
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
    const res = await this.api.get<PaginatedResponse<Sermon>>(`${this.namespace}/sermons`, query);
    return { ...res, data: (res.data ?? []).map(mapSermon) };
  }

  async getSermon(id: string): Promise<Sermon> {
    const res = await this.api.get(`${this.namespace}/sermons/${id}`);
    return mapSermon(unwrapData(res));
  }

  async createSermon(data: Omit<Sermon, 'id' | 'createdAt' | 'modifiedAt'>): Promise<Sermon> {
    const res = await this.api.post(`${this.namespace}/sermons`, data);
    return mapSermon(unwrapData(res));
  }

  async updateSermon(id: string, data: Partial<Sermon>): Promise<Sermon> {
    const res = await this.api.put(`${this.namespace}/sermons/${id}`, data);
    return mapSermon(unwrapData(res));
  }

  async deleteSermon(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/sermons/${id}`);
  }

  async getRelatedSermons(
    id: string,
    options?: { taxonomy?: string; limit?: number },
  ): Promise<Sermon[]> {
    const res = await this.api.get(`${this.namespace}/sermons/${id}/related`, {
      taxonomy: options?.taxonomy ?? 'sermon_category',
      limit: options?.limit ?? 4,
    });
    const list = unwrapData<Sermon[]>(res);
    return Array.isArray(list) ? list.map(mapSermon) : [];
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

  // ─── Videos (영상 게시판) ────────────────────────────────
  // Each method unwraps the server's `{ data }` envelope via unwrapData
  // (the `(res as { data }).data ?? res` convention) — list returns the
  // paginated envelope as-is to preserve total/page metadata.
  async getVideos(params?: VideoListParams): Promise<PaginatedResponse<Video>> {
    const query = { ...toQueryParams(params), category: params?.category };
    return this.api.get(`${this.namespace}/videos`, query);
  }

  async getVideo(id: string): Promise<Video> {
    const res = await this.api.get(`${this.namespace}/videos/${id}`);
    return unwrapData(res);
  }

  async createVideo(data: Omit<Video, 'id' | 'createdAt' | 'categoryName'>): Promise<Video> {
    const res = await this.api.post(`${this.namespace}/videos`, data);
    return unwrapData(res);
  }

  async updateVideo(id: string, data: Partial<Video>): Promise<Video> {
    const res = await this.api.put(`${this.namespace}/videos/${id}`, data);
    return unwrapData(res);
  }

  async deleteVideo(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/videos/${id}`);
  }

  async getVideoCategories(): Promise<VideoCategory[]> {
    const res = await this.api.get(`${this.namespace}/videos/categories`);
    return unwrapData(res);
  }

  async createVideoCategory(data: { name: string; slug: string }): Promise<VideoCategory> {
    const res = await this.api.post(`${this.namespace}/videos/categories`, data);
    return unwrapData(res);
  }

  async updateVideoCategory(id: string, data: { name?: string; slug?: string }): Promise<VideoCategory> {
    const res = await this.api.put(`${this.namespace}/videos/categories/${id}`, data);
    return unwrapData(res);
  }

  async deleteVideoCategory(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/videos/categories/${id}`);
  }

  // ─── Schedules (예배 및 모임) ────────────────────────────────
  // The list endpoint returns a `{ data }` envelope (not paginated) — each
  // method unwraps it via unwrapData.
  async getSchedules(params?: ScheduleListParams): Promise<Schedule[]> {
    const res = await this.api.get(`${this.namespace}/schedules`, toQueryParams(params));
    return unwrapData(res);
  }

  async getSchedule(id: string): Promise<Schedule> {
    const res = await this.api.get(`${this.namespace}/schedules/${id}`);
    return unwrapData(res);
  }

  async createSchedule(data: Omit<Schedule, 'id' | 'createdAt'>): Promise<Schedule> {
    const res = await this.api.post(`${this.namespace}/schedules`, data);
    return unwrapData(res);
  }

  async updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule> {
    const res = await this.api.put(`${this.namespace}/schedules/${id}`, data);
    return unwrapData(res);
  }

  async deleteSchedule(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/schedules/${id}`);
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
    const res = await this.api.get(`${this.namespace}/staff`, {
      department: params?.department,
      active_only: params?.activeOnly,
    });
    return unwrapData(res);
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
    const res = await this.api.get(`${this.namespace}/history`, { year: params?.year });
    return unwrapData(res);
  }

  async getHistoryEntry(id: string): Promise<History> {
    const res = await this.api.get(`${this.namespace}/history/${id}`);
    return unwrapData(res);
  }

  async getHistoryYears(): Promise<number[]> {
    const res = await this.api.get(`${this.namespace}/history/years`);
    return unwrapData(res);
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

  // ─── Cells (목장/셀) ─────────────────────────────────────
  async getCells(): Promise<Cell[]> {
    const res = await this.api.get(`${this.namespace}/cells`);
    return unwrapData(res);
  }

  async getCell(id: string): Promise<Cell> {
    const res = await this.api.get(`${this.namespace}/cells/${id}`);
    return unwrapData(res);
  }

  async createCell(data: Omit<Cell, 'id'>): Promise<Cell> {
    const res = await this.api.post(`${this.namespace}/cells`, data);
    return unwrapData(res);
  }

  async updateCell(id: string, data: Partial<Cell>): Promise<Cell> {
    const res = await this.api.put(`${this.namespace}/cells/${id}`, data);
    return unwrapData(res);
  }

  async deleteCell(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/cells/${id}`);
  }

  // ─── Newcomers (새가족 등록·관리) ────────────────────────
  async getNewcomers(status?: NewcomerStatus): Promise<Newcomer[]> {
    const res = await this.api.get(`${this.namespace}/newcomers`, { status });
    return unwrapData(res);
  }

  async getNewcomer(id: string): Promise<Newcomer> {
    const res = await this.api.get(`${this.namespace}/newcomers/${id}`);
    return unwrapData(res);
  }

  /** Public intake form submission (no auth — relies on X-Tenant-Slug). */
  async submitNewcomer(data: NewcomerSubmission): Promise<Newcomer> {
    const res = await this.api.post(`${this.namespace}/newcomers`, data);
    return unwrapData(res);
  }

  async updateNewcomer(id: string, data: Partial<Newcomer>): Promise<Newcomer> {
    const res = await this.api.put(`${this.namespace}/newcomers/${id}`, data);
    return unwrapData(res);
  }

  async deleteNewcomer(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/newcomers/${id}`);
  }

  // ─── Form submissions (문의 / 목장사역보고서 / 커스텀 폼 인박스) ──────
  /** Public form submission (no auth — relies on X-Tenant-Slug). */
  async submitForm(formType: string, payload: Record<string, unknown>): Promise<FormSubmission> {
    const res = await this.api.post(`${this.namespace}/forms/${formType}`, payload);
    return unwrapData(res);
  }

  async getFormSubmissions(params?: { formType?: string; status?: FormSubmissionStatus }): Promise<FormSubmission[]> {
    const res = await this.api.get(`${this.namespace}/admin/forms/submissions`, params);
    return unwrapData(res);
  }

  async getFormSubmission(id: string): Promise<FormSubmission> {
    const res = await this.api.get(`${this.namespace}/admin/forms/submissions/${id}`);
    return unwrapData(res);
  }

  async updateFormSubmission(id: string, data: { status?: FormSubmissionStatus; memo?: string }): Promise<FormSubmission> {
    const res = await this.api.put(`${this.namespace}/admin/forms/submissions/${id}`, data);
    return unwrapData(res);
  }

  async deleteFormSubmission(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/admin/forms/submissions/${id}`);
  }

  // ─── Boards (게시판) ───���──────────────────────────────────
  async getBoards(): Promise<Board[]> {
    const res = await this.api.get(`${this.namespace}/boards`);
    return (res as { data: Board[] }).data ?? res;
  }

  async getBoard(id: string): Promise<Board> {
    const res = await this.api.get(`${this.namespace}/boards/${id}`);
    return (res as { data: Board }).data ?? res;
  }

  async createBoard(data: Omit<Board, 'id' | 'postCount' | 'createdAt' | 'updatedAt'>): Promise<Board> {
    const res = await this.api.post(`${this.namespace}/boards`, data);
    return (res as { data: Board }).data ?? res;
  }

  async updateBoard(id: string, data: Partial<Board>): Promise<Board> {
    const res = await this.api.put(`${this.namespace}/boards/${id}`, data);
    return (res as { data: Board }).data ?? res;
  }

  async deleteBoard(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/boards/${id}`);
  }

  async getBoardPosts(boardId: string, params?: ListParams): Promise<PaginatedResponse<BoardPost>> {
    return this.api.get(`${this.namespace}/boards/${boardId}/posts`, toQueryParams(params));
  }

  async getBoardPost(boardId: string, postId: string): Promise<BoardPost> {
    const res = await this.api.get(`${this.namespace}/boards/${boardId}/posts/${postId}`);
    return (res as { data: BoardPost }).data ?? res;
  }

  async createBoardPost(boardId: string, data: Omit<BoardPost, 'id' | 'boardId' | 'viewCount' | 'createdAt' | 'updatedAt'>): Promise<BoardPost> {
    const res = await this.api.post(`${this.namespace}/boards/${boardId}/posts`, data);
    return (res as { data: BoardPost }).data ?? res;
  }

  async updateBoardPost(boardId: string, postId: string, data: Partial<BoardPost>): Promise<BoardPost> {
    const res = await this.api.put(`${this.namespace}/boards/${boardId}/posts/${postId}`, data);
    return (res as { data: BoardPost }).data ?? res;
  }

  async deleteBoardPost(boardId: string, postId: string): Promise<void> {
    return this.api.delete(`${this.namespace}/boards/${boardId}/posts/${postId}`);
  }

  // ─── Settings ───────────────────────────────────────────
  // The server replies with a { data: {...} } envelope and FetchAdapter does
  // NOT auto-unwrap it — every sibling method strips it with `.data ?? res`.
  // These two were missing that, so SettingsPage's reset() spread the envelope
  // and the form always read back empty (write to DB was fine — it was a
  // read-back bug). See b2bsmart HISTORY-2026-06-10-SETTINGS-ENVELOPE-BUG.
  async getSettings(): Promise<ChurchSettings> {
    const res = await this.api.get(`${this.namespace}/settings`);
    return (res as { data: ChurchSettings }).data ?? res;
  }

  async updateSettings(data: Partial<ChurchSettings>): Promise<ChurchSettings> {
    const res = await this.api.put(`${this.namespace}/settings`, data);
    return (res as { data: ChurchSettings }).data ?? res;
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
    const res = await this.api.get(`${this.namespace}/taxonomies/sermon_category`);
    return unwrapData(res);
  }

  async getSermonPreachers(): Promise<TaxonomyTerm[]> {
    // Preachers live in the dedicated `preachers` table (sermons.preacher_id FK,
    // seeded there, and POST /preachers writes there) — NOT categories. Reading
    // /taxonomies/sermon_preacher hit the wrong table, so newly added preachers
    // never showed in the dropdown.
    const res = await this.api.get(`${this.namespace}/preachers`);
    return unwrapData(res);
  }

  async getBannerCategories(): Promise<TaxonomyTerm[]> {
    const res = await this.api.get(`${this.namespace}/taxonomies/banner_category`);
    return unwrapData(res);
  }

  async getAlbumCategories(): Promise<TaxonomyTerm[]> {
    const res = await this.api.get(`${this.namespace}/taxonomies/album_category`);
    return unwrapData(res);
  }

  async getStaffDepartments(): Promise<TaxonomyTerm[]> {
    const res = await this.api.get(`${this.namespace}/taxonomies/staff_department`);
    return unwrapData(res);
  }

  // ─── Category CRUD (dedicated endpoints, shared by CategoryManager) ──────
  // The taxonomy getters above read the read-optimized `/taxonomies/:type`
  // view (includes `count`). These hit the dedicated `/*-categories` routes so
  // the id/name/slug round-trips through create/update/delete consistently.
  async getSermonCategoriesList(): Promise<Category[]> {
    const res = await this.api.get(`${this.namespace}/sermon-categories`);
    return unwrapData(res);
  }

  async createSermonCategory(data: { name: string; slug: string }): Promise<Category> {
    const res = await this.api.post(`${this.namespace}/sermon-categories`, data);
    return unwrapData(res);
  }

  async updateSermonCategory(id: string, data: { name?: string; slug?: string }): Promise<Category> {
    const res = await this.api.put(`${this.namespace}/sermon-categories/${id}`, data);
    return unwrapData(res);
  }

  async deleteSermonCategory(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/sermon-categories/${id}`);
  }

  async getAlbumCategoriesList(): Promise<Category[]> {
    const res = await this.api.get(`${this.namespace}/album-categories`);
    return unwrapData(res);
  }

  async createAlbumCategory(data: { name: string; slug: string }): Promise<Category> {
    const res = await this.api.post(`${this.namespace}/album-categories`, data);
    return unwrapData(res);
  }

  async updateAlbumCategory(id: string, data: { name?: string; slug?: string }): Promise<Category> {
    const res = await this.api.put(`${this.namespace}/album-categories/${id}`, data);
    return unwrapData(res);
  }

  async deleteAlbumCategory(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/album-categories/${id}`);
  }

  // ─── Pages ──────────────────────────────────────────────
  async getPages(): Promise<Page[]> {
    const res = await this.api.get(`${this.namespace}/pages`);
    const data = unwrapData<Record<string, unknown>[]>(res);
    return (Array.isArray(data) ? data : []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      title: (p.title ?? '') as string,
      slug: (p.slug ?? '') as string,
      isHome: (p.is_home ?? p.isHome ?? false) as boolean,
      status: (p.status ?? 'draft') as Page['status'],
      sortOrder: (p.sort_order ?? p.sortOrder ?? 0) as number,
      sections: (p.sections ?? []) as PageSection[],
    }));
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
    const res = await this.api.get(`${this.namespace}/pages/${pageId}/sections`);
    const data = unwrapData<Record<string, unknown>[]>(res);
    // Convert snake_case to camelCase for each section
    return (Array.isArray(data) ? data : []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      pageId: (s.page_id ?? s.pageId) as string,
      blockType: (s.block_type ?? s.blockType) as string,
      props: (s.props ?? {}) as Record<string, unknown>,
      sortOrder: (s.sort_order ?? s.sortOrder ?? 0) as number,
      isVisible: (s.is_visible ?? s.isVisible ?? true) as boolean,
    }));
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
    const res = await this.api.get(`${this.namespace}/menus`);
    const data = unwrapData<Record<string, unknown>[]>(res);
    return (Array.isArray(data) ? data : []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      label: (m.label ?? '') as string,
      pageId: (m.page_id ?? m.pageId ?? null) as string | null,
      pageSlug: (m.page_slug ?? m.pageSlug ?? null) as string | null,
      externalUrl: (m.external_url ?? m.externalUrl ?? null) as string | null,
      parentId: (m.parent_id ?? m.parentId ?? null) as string | null,
      sortOrder: (m.sort_order ?? m.sortOrder ?? 0) as number,
      isVisible: (m.is_visible ?? m.isVisible ?? true) as boolean,
    }));
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

  async reorderMenus(items: { id: string; parentId: string | null; sortOrder: number }[]): Promise<void> {
    return this.api.post(`${this.namespace}/menus/reorder`, { items });
  }

  // ─── Theme ──────────────────────────────────────────────
  async getTheme(): Promise<Theme> {
    return this.api.get(`${this.namespace}/theme`);
  }

  async updateTheme(data: Partial<Theme>): Promise<Theme> {
    return this.api.put(`${this.namespace}/theme`, data);
  }

  async getThemePresets(): Promise<TemplatePreset[]> {
    const res = await this.api.get(`${this.namespace}/theme/presets`);
    return (res as { data: TemplatePreset[] }).data ?? res;
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
    // Server returns { data: UploadedFile } — unwrap so callers get { id, url } directly.
    const response = await this.api.post<{ data: UploadedFile } | UploadedFile>(
      `${this.namespace}/files/upload`,
      formData,
    );
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data: UploadedFile }).data;
    }
    return response as UploadedFile;
  }

  async deleteFile(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/files/${id}`);
  }

  // ─── Data Export ────────────────────────────────────────
  /**
   * Download the tenant's full content archive as a JSON Blob (available on
   * every tier — the SaaS exit guarantee). Bypasses key camelization so the
   * raw DB column names are preserved in the archive.
   */
  async exportData(): Promise<Blob> {
    if (!this.fetchAdapter) {
      throw new Error('exportData requires the default fetch adapter');
    }
    return this.fetchAdapter.getBlob(`${this.namespace}/export`);
  }

  // ─── Site Intake (결제 후 콘텐츠 입력) ──────────────────
  /** Load this church's intake draft (resume mid-progress). */
  async getIntake(): Promise<{ tenantSlug?: string; plan?: string; data: Record<string, unknown>; status: string; buildStage?: string }> {
    const res = await this.api.get(`${this.namespace}/intake`);
    return unwrapData(res);
  }

  /** Super admin: set the build pipeline stage shown on the church dashboard. */
  async setBuildStage(slug: string, stage: string): Promise<{ buildStage?: string }> {
    const res = await this.api.post(`${this.namespace}/admin/intake/${slug}/build-stage`, { stage });
    return unwrapData(res);
  }

  /** Save the intake draft (mid-progress save — explicit, no auto-save). */
  async saveIntake(data: Record<string, unknown>): Promise<{ data: Record<string, unknown>; status: string }> {
    const res = await this.api.put(`${this.namespace}/intake`, { data });
    return unwrapData(res);
  }

  /** Submit the completed intake. */
  async submitIntake(): Promise<{ status: string }> {
    const res = await this.api.post(`${this.namespace}/intake/submit`);
    return unwrapData(res);
  }

  async getFiles(): Promise<UploadedFile[]> {
    return this.api.get(`${this.namespace}/files`);
  }

  // ─── AI Generation ──────────────────────────────────────
  async generateText(prompt: string, context?: string): Promise<{ text: string }> {
    const res = await this.api.post(`${this.namespace}/ai/generate-text`, { prompt, context });
    return (res as { data: { text: string } }).data ?? res;
  }

  // ─── Domains ─────────────────────────────────────────────
  async getDomains(): Promise<{ id: string; domain: string; status: string; verified_at: string | null; created_at: string; updated_at: string }[]> {
    const res = await this.api.get(`${this.namespace}/domains`);
    return unwrapData(res);
  }

  async addDomain(domain: string): Promise<{ id: string; domain: string; status: string; verified_at: string | null; created_at: string; updated_at: string }> {
    const res = await this.api.post(`${this.namespace}/domains`, { domain });
    return unwrapData(res);
  }

  async removeDomain(id: string): Promise<void> {
    return this.api.delete(`${this.namespace}/domains/${id}`);
  }

  async verifyDomain(id: string): Promise<{ id: string; domain: string; status: string; verified_at: string | null; created_at: string; updated_at: string }> {
    const res = await this.api.post(`${this.namespace}/domains/${id}/verify`);
    return unwrapData(res);
  }

  // ─── Billing ─────────────────────────────────────────────
  async getBillingStatus(): Promise<{
    tenantId: string;
    plan: string;
    isActive: boolean;
    stripeCustomerId: string | null;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
  }> {
    return this.api.get(`${this.namespace}/billing`);
  }

  async createCheckout(params: { plan: string; successUrl: string; cancelUrl: string }): Promise<{ url: string }> {
    return this.api.post(`${this.namespace}/billing/checkout`, params);
  }

  async createPortalSession(returnUrl: string): Promise<{ url: string }> {
    return this.api.post(`${this.namespace}/billing/portal`, { returnUrl });
  }
}
