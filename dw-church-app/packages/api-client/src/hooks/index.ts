import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DWChurchClient } from '../client';
import type {
  AuthSession,
  AuthUser,
  Bulletin,
  Sermon,
  Column,
  Album,
  Banner,
  Event,
  Staff,
  History,
  ChurchSettings,
  ListParams,
  LoginInput,
  MenuItem,
  Page,
  PageSection,
  RegisterInput,
  SermonListParams,
  BannerListParams,
  StaffListParams,
  HistoryListParams,
  PaginatedResponse,
  RelatedPostsParams,
  TaxonomyTerm,
  Theme,
  UploadedFile,
} from '../types';
import { useContext, createContext } from 'react';

// ─── Client Context ─────────────────────────────────────────
export const DWChurchClientContext = createContext<DWChurchClient | null>(null);

export function useDWChurchClient(): DWChurchClient | null {
  return useContext(DWChurchClientContext);
}

// ─── Query Key Factory ──────────────────────────────────────
export const queryKeys = {
  bulletins: {
    all: ['bulletins'] as const,
    list: (params?: ListParams) => ['bulletins', 'list', params] as const,
    detail: (id: string) => ['bulletins', 'detail', id] as const,
    related: (id: string) => ['bulletins', 'related', id] as const,
  },
  sermons: {
    all: ['sermons'] as const,
    list: (params?: SermonListParams) => ['sermons', 'list', params] as const,
    detail: (id: string) => ['sermons', 'detail', id] as const,
    related: (id: string, taxonomy?: string) =>
      ['sermons', 'related', id, taxonomy] as const,
  },
  columns: {
    all: ['columns'] as const,
    list: (params?: ListParams) => ['columns', 'list', params] as const,
    detail: (id: string) => ['columns', 'detail', id] as const,
    related: (id: string) => ['columns', 'related', id] as const,
  },
  albums: {
    all: ['albums'] as const,
    list: (params?: ListParams) => ['albums', 'list', params] as const,
    detail: (id: string) => ['albums', 'detail', id] as const,
    related: (id: string) => ['albums', 'related', id] as const,
  },
  banners: {
    all: ['banners'] as const,
    list: (params?: BannerListParams) => ['banners', 'list', params] as const,
    detail: (id: string) => ['banners', 'detail', id] as const,
  },
  events: {
    all: ['events'] as const,
    list: (params?: ListParams) => ['events', 'list', params] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
    related: (id: string) => ['events', 'related', id] as const,
  },
  staff: {
    all: ['staff'] as const,
    list: (params?: StaffListParams) => ['staff', 'list', params] as const,
    detail: (id: string) => ['staff', 'detail', id] as const,
  },
  history: {
    all: ['history'] as const,
    list: (params?: HistoryListParams) => ['history', 'list', params] as const,
    detail: (id: string) => ['history', 'detail', id] as const,
    years: ['history', 'years'] as const,
  },
  settings: ['settings'] as const,
  taxonomies: {
    sermonCategories: ['taxonomies', 'sermon_category'] as const,
    sermonPreachers: ['taxonomies', 'sermon_preacher'] as const,
    bannerCategories: ['taxonomies', 'banner_category'] as const,
    albumCategories: ['taxonomies', 'album_category'] as const,
    staffDepartments: ['taxonomies', 'staff_department'] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  pages: {
    all: ['pages'] as const,
    detail: (slug: string) => ['pages', 'detail', slug] as const,
    sections: (pageId: string) => ['pages', 'sections', pageId] as const,
  },
  menus: {
    all: ['menus'] as const,
  },
  theme: ['theme'] as const,
  files: {
    all: ['files'] as const,
  },
} as const;

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ─── Auth Hooks ─────────────────────────────────────────────
export function useLogin() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation<AuthSession, Error, LoginInput>({
    mutationFn: (input) => client!.login(input),
    onSuccess: (session) => {
      client.setToken(session.accessToken);
      queryClient.setQueryData(queryKeys.auth.me, session.user);
    },
  });
}

export function useRegister() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation<AuthSession, Error, RegisterInput>({
    mutationFn: (input) => client!.register(input),
    onSuccess: (session) => {
      client.setToken(session.accessToken);
      queryClient.setQueryData(queryKeys.auth.me, session.user);
    },
  });
}

export function useLogout() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => client!.logout(),
    onSuccess: () => {
      client.clearToken();
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  const client = useDWChurchClient();
  return useQuery<AuthUser>({
    queryKey: queryKeys.auth.me,
    queryFn: () => client!.getMe(),
    staleTime: STALE_TIME,
    retry: false,
  });
}

export function useUpdateProfile() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation<AuthUser, Error, { name?: string; email?: string }>({
    mutationFn: (data) => client!.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useForgotPassword() {
  const client = useDWChurchClient();
  return useMutation<void, Error, string>({
    mutationFn: (email) => client!.forgotPassword(email),
  });
}

export function useInviteUser() {
  const client = useDWChurchClient();
  return useMutation<void, Error, { email: string; name: string; role: 'admin' | 'editor' }>({
    mutationFn: ({ email, name, role }) => client!.invite(email, name, role),
  });
}

// ─── Bulletin Hooks ─────────────────────────────────────────
export function useBulletins(params?: ListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Bulletin>>({
    queryKey: queryKeys.bulletins.list(params),
    queryFn: () => client!.getBulletins(params),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useBulletin(id: string) {
  const client = useDWChurchClient();
  return useQuery<Bulletin>({
    queryKey: queryKeys.bulletins.detail(id),
    queryFn: () => client!.getBulletin(id),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateBulletin() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Bulletin, 'id' | 'createdAt' | 'modifiedAt'>) => client!.createBulletin(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.bulletins.all }),
  });
}

export function useUpdateBulletin() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bulletin> }) =>
      client.updateBulletin(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.bulletins.all }),
  });
}

export function useDeleteBulletin() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteBulletin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.bulletins.all }),
  });
}

export function useRelatedBulletins(id: string, limit = 4) {
  const client = useDWChurchClient();
  return useQuery<Bulletin[]>({
    queryKey: queryKeys.bulletins.related(id),
    queryFn: () => client!.getRelatedBulletins(id, limit),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Sermon Hooks ───────────────────────────────────────────
export function useSermons(params?: SermonListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Sermon>>({
    queryKey: queryKeys.sermons.list(params),
    queryFn: () => client!.getSermons(params),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useSermon(id: string) {
  const client = useDWChurchClient();
  return useQuery<Sermon>({
    queryKey: queryKeys.sermons.detail(id),
    queryFn: () => client!.getSermon(id),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateSermon() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Sermon, 'id' | 'createdAt' | 'modifiedAt'>) => client!.createSermon(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sermons.all }),
  });
}

export function useUpdateSermon() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Sermon> }) =>
      client.updateSermon(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sermons.all }),
  });
}

export function useDeleteSermon() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteSermon(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sermons.all }),
  });
}

export function useRelatedSermons(
  id: string,
  options?: { taxonomy?: string; limit?: number },
) {
  const client = useDWChurchClient();
  return useQuery<Sermon[]>({
    queryKey: queryKeys.sermons.related(id, options?.taxonomy),
    queryFn: () => client!.getRelatedSermons(id, options),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Column Hooks ───────────────────────────────────────────
export function useColumns(params?: ListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Column>>({
    queryKey: queryKeys.columns.list(params),
    queryFn: () => client!.getColumns(params),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useColumn(id: string) {
  const client = useDWChurchClient();
  return useQuery<Column>({
    queryKey: queryKeys.columns.detail(id),
    queryFn: () => client!.getColumn(id),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateColumn() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Column, 'id' | 'createdAt' | 'modifiedAt'>) => client!.createColumn(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.columns.all }),
  });
}

export function useUpdateColumn() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Column> }) =>
      client.updateColumn(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.columns.all }),
  });
}

export function useDeleteColumn() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteColumn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.columns.all }),
  });
}

export function useRelatedColumns(id: string, limit = 4) {
  const client = useDWChurchClient();
  return useQuery<Column[]>({
    queryKey: queryKeys.columns.related(id),
    queryFn: () => client!.getRelatedColumns(id, limit),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Album Hooks ────────────────────────────────────────────
export function useAlbums(params?: ListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Album>>({
    queryKey: queryKeys.albums.list(params),
    queryFn: () => client!.getAlbums(params),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useAlbum(id: string) {
  const client = useDWChurchClient();
  return useQuery<Album>({
    queryKey: queryKeys.albums.detail(id),
    queryFn: () => client!.getAlbum(id),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateAlbum() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Album, 'id' | 'createdAt' | 'modifiedAt'>) => client!.createAlbum(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.albums.all }),
  });
}

export function useUpdateAlbum() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Album> }) =>
      client.updateAlbum(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.albums.all }),
  });
}

export function useDeleteAlbum() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteAlbum(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.albums.all }),
  });
}

export function useRelatedAlbums(id: string, limit = 4) {
  const client = useDWChurchClient();
  return useQuery<Album[]>({
    queryKey: queryKeys.albums.related(id),
    queryFn: () => client!.getRelatedAlbums(id, limit),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Banner Hooks ───────────────────────────────────────────
export function useBanners(params?: BannerListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Banner>>({
    queryKey: queryKeys.banners.list(params),
    queryFn: () => client!.getBanners(params),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useActiveBanners(category?: 'main' | 'sub') {
  return useBanners({ category, active: true });
}

export function useCreateBanner() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Banner, 'id' | 'createdAt' | 'modifiedAt'>) => client!.createBanner(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.banners.all }),
  });
}

export function useUpdateBanner() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Banner> }) =>
      client.updateBanner(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.banners.all }),
  });
}

export function useDeleteBanner() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteBanner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.banners.all }),
  });
}

export function useBanner(id: string) {
  const client = useDWChurchClient();
  return useQuery<Banner>({
    queryKey: queryKeys.banners.detail(id),
    queryFn: () => client!.getBanner(id),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Event Hooks ────────────────────────────────────────────
export function useEvents(params?: ListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Event>>({
    queryKey: queryKeys.events.list(params),
    queryFn: () => client!.getEvents(params),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useEvent(id: string) {
  const client = useDWChurchClient();
  return useQuery<Event>({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => client!.getEvent(id),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateEvent() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Event, 'id' | 'createdAt' | 'modifiedAt'>) => client!.createEvent(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}

export function useUpdateEvent() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) =>
      client.updateEvent(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}

export function useDeleteEvent() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}

export function useRelatedEvents(id: string, limit = 4) {
  const client = useDWChurchClient();
  return useQuery<Event[]>({
    queryKey: queryKeys.events.related(id),
    queryFn: () => client!.getRelatedEvents(id, limit),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Staff Hooks ────────────────────────────────────────────
export function useStaff(params?: StaffListParams) {
  const client = useDWChurchClient();
  return useQuery<Staff[]>({
    queryKey: queryKeys.staff.list(params),
    queryFn: () => client!.getStaff(params),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useStaffMember(id: string) {
  const client = useDWChurchClient();
  return useQuery<Staff>({
    queryKey: queryKeys.staff.detail(id),
    queryFn: () => client!.getStaffMember(id),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateStaff() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Staff, 'id'>) => client!.createStaff(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
  });
}

export function useUpdateStaff() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) =>
      client.updateStaff(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
  });
}

export function useDeleteStaff() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteStaff(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
  });
}

export function useReorderStaff() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => client!.reorderStaff(orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
  });
}

// ─── History Hooks ──────────────────────────────────────────
export function useHistory(params?: HistoryListParams) {
  const client = useDWChurchClient();
  return useQuery<History[]>({
    queryKey: queryKeys.history.list(params),
    queryFn: () => client!.getHistory(params),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useHistoryEntry(id: string) {
  const client = useDWChurchClient();
  return useQuery<History>({
    queryKey: queryKeys.history.detail(id),
    queryFn: () => client!.getHistoryEntry(id),
    enabled: !!client && !!id,
    staleTime: STALE_TIME,
  });
}

export function useHistoryYears() {
  const client = useDWChurchClient();
  return useQuery<number[]>({
    queryKey: queryKeys.history.years,
    queryFn: () => client!.getHistoryYears(),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useCreateHistory() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<History, 'id'>) => client!.createHistory(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.history.all }),
  });
}

export function useUpdateHistory() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<History> }) =>
      client.updateHistory(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.history.all }),
  });
}

export function useDeleteHistory() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteHistory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.history.all }),
  });
}

// ─── Settings Hooks ─────────────────────────────────────────
export function useChurchSettings() {
  const client = useDWChurchClient();
  return useQuery<ChurchSettings>({
    queryKey: queryKeys.settings,
    queryFn: () => client!.getSettings(),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useUpdateChurchSettings() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ChurchSettings>) => client!.updateSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
  });
}

// ─── Related Posts (generic) ────────────────────────────────
export function useRelatedPosts<T>(params: RelatedPostsParams) {
  const client = useDWChurchClient();
  return useQuery<T[]>({
    queryKey: ['related', params.postType, params.currentId, params.taxonomy],
    queryFn: () => client!.getRelatedPosts<T>(params),
    enabled: !!client && !!params.currentId,
    staleTime: STALE_TIME,
  });
}

// ─── Taxonomy Hooks ─────────────────────────────────────────
export function useSermonCategories() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.sermonCategories,
    queryFn: () => client!.getSermonCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes (taxonomies change rarely)
  });
}

export function useSermonPreachers() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.sermonPreachers,
    queryFn: () => client!.getSermonPreachers(),
    enabled: !!client,
    staleTime: 30 * 60 * 1000,
  });
}

export function useBannerCategories() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.bannerCategories,
    queryFn: () => client!.getBannerCategories(),
    enabled: !!client,
    staleTime: 30 * 60 * 1000,
  });
}

export function useAlbumCategories() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.albumCategories,
    queryFn: () => client!.getAlbumCategories(),
    enabled: !!client,
    staleTime: 30 * 60 * 1000,
  });
}

export function useStaffDepartments() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.staffDepartments,
    queryFn: () => client!.getStaffDepartments(),
    enabled: !!client,
    staleTime: 30 * 60 * 1000,
  });
}

// ─── Page Hooks ─────────────────────────────────────────────
export function usePages() {
  const client = useDWChurchClient();
  return useQuery<Page[]>({
    queryKey: queryKeys.pages.all,
    queryFn: () => client!.getPages(),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function usePage(slug: string) {
  const client = useDWChurchClient();
  return useQuery<Page>({
    queryKey: queryKeys.pages.detail(slug),
    queryFn: () => client!.getPage(slug),
    enabled: !!client && !!slug,
    staleTime: STALE_TIME,
  });
}

export function useCreatePage() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Page, 'id' | 'sections'>) => client!.createPage(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pages.all }),
  });
}

export function useUpdatePage() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Page> }) =>
      client.updatePage(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pages.all }),
  });
}

export function useDeletePage() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deletePage(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pages.all }),
  });
}

export function usePageSections(pageId: string) {
  const client = useDWChurchClient();
  return useQuery<PageSection[]>({
    queryKey: queryKeys.pages.sections(pageId),
    queryFn: () => client!.getPageSections(pageId),
    enabled: !!client && !!pageId,
    staleTime: STALE_TIME,
  });
}

export function useCreateSection() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: Omit<PageSection, 'id' | 'pageId'> }) =>
      client.createSection(pageId, data),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.sections(variables.pageId) }),
  });
}

export function useUpdateSection() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, sectionId, data }: { pageId: string; sectionId: string; data: Partial<PageSection> }) =>
      client.updateSection(pageId, sectionId, data),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.sections(variables.pageId) }),
  });
}

export function useDeleteSection() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, sectionId }: { pageId: string; sectionId: string }) =>
      client.deleteSection(pageId, sectionId),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.sections(variables.pageId) }),
  });
}

export function useReorderSections() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, orderedIds }: { pageId: string; orderedIds: string[] }) =>
      client.reorderSections(pageId, orderedIds),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.sections(variables.pageId) }),
  });
}

// ─── Menu Hooks ─────────────────────────────────────────────
export function useMenus() {
  const client = useDWChurchClient();
  return useQuery<MenuItem[]>({
    queryKey: queryKeys.menus.all,
    queryFn: () => client!.getMenus(),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useCreateMenu() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<MenuItem, 'id' | 'children'>) => client!.createMenu(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menus.all }),
  });
}

export function useUpdateMenu() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) =>
      client.updateMenu(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menus.all }),
  });
}

export function useDeleteMenu() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.deleteMenu(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menus.all }),
  });
}

export function useReorderMenus() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => client!.reorderMenus(orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menus.all }),
  });
}

// ─── Theme Hooks ────────────────────────────────────────────
export function useTheme() {
  const client = useDWChurchClient();
  return useQuery<Theme>({
    queryKey: queryKeys.theme,
    queryFn: () => client!.getTheme(),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useUpdateTheme() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Theme>) => client!.updateTheme(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.theme }),
  });
}

// ─── User Hooks ─────────────────────────────────────────────
export function useUsers() {
  const client = useDWChurchClient();
  return useQuery<AuthUser[]>({
    queryKey: ['users'] as const,
    queryFn: () => client!.getUsers(),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useRemoveUser() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => client!.removeUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ─── File Hooks ─────────────────────────────────────────────
export function useUploadFile() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation<UploadedFile, Error, File>({
    mutationFn: (file) => client!.uploadFile(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.files.all }),
  });
}

export function useDeleteFile() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => client!.deleteFile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.files.all }),
  });
}

export function useFiles() {
  const client = useDWChurchClient();
  return useQuery<UploadedFile[]>({
    queryKey: queryKeys.files.all,
    queryFn: () => client!.getFiles(),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

// ─── Domain Hooks ───────────────────────────────────────
export function useDomains() {
  const client = useDWChurchClient();
  return useQuery({
    queryKey: ['domains'] as const,
    queryFn: () => client!.getDomains(),
    enabled: !!client,
    staleTime: STALE_TIME,
  });
}

export function useAddDomain() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) => client!.addDomain(domain),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains'] }),
  });
}

export function useRemoveDomain() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.removeDomain(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains'] }),
  });
}

export function useVerifyDomain() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client!.verifyDomain(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains'] }),
  });
}

// ─── Billing Hooks ──────────────────────────────────────────
export function useBillingStatus() {
  const client = useDWChurchClient();
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: () => client!.getBillingStatus(),
    enabled: !!client,
    staleTime: 60 * 1000,
  });
}

export function useBillingCheckout() {
  const client = useDWChurchClient();
  return useMutation({
    mutationFn: (params: { plan: string; successUrl: string; cancelUrl: string }) =>
      client.createCheckout(params),
  });
}

export function useBillingPortal() {
  const client = useDWChurchClient();
  return useMutation({
    mutationFn: (returnUrl: string) => client!.createPortalSession(returnUrl),
  });
}
