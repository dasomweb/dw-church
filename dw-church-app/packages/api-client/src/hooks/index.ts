import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DWChurchClient } from '../client';
import type {
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
  SermonListParams,
  BannerListParams,
  StaffListParams,
  HistoryListParams,
  PaginatedResponse,
  RelatedPostsParams,
  TaxonomyTerm,
} from '../types';
import { useContext, createContext } from 'react';

// ─── Client Context ─────────────────────────────────────────
export const DWChurchClientContext = createContext<DWChurchClient | null>(null);

export function useDWChurchClient(): DWChurchClient {
  const client = useContext(DWChurchClientContext);
  if (!client) {
    throw new Error('useDWChurchClient must be used within a DWChurchProvider');
  }
  return client;
}

// ─── Query Key Factory ──────────────────────────────────────
export const queryKeys = {
  bulletins: {
    all: ['bulletins'] as const,
    list: (params?: ListParams) => ['bulletins', 'list', params] as const,
    detail: (id: number) => ['bulletins', 'detail', id] as const,
    related: (id: number) => ['bulletins', 'related', id] as const,
  },
  sermons: {
    all: ['sermons'] as const,
    list: (params?: SermonListParams) => ['sermons', 'list', params] as const,
    detail: (id: number) => ['sermons', 'detail', id] as const,
    related: (id: number, taxonomy?: string) =>
      ['sermons', 'related', id, taxonomy] as const,
  },
  columns: {
    all: ['columns'] as const,
    list: (params?: ListParams) => ['columns', 'list', params] as const,
    detail: (id: number) => ['columns', 'detail', id] as const,
    related: (id: number) => ['columns', 'related', id] as const,
  },
  albums: {
    all: ['albums'] as const,
    list: (params?: ListParams) => ['albums', 'list', params] as const,
    detail: (id: number) => ['albums', 'detail', id] as const,
    related: (id: number) => ['albums', 'related', id] as const,
  },
  banners: {
    all: ['banners'] as const,
    list: (params?: BannerListParams) => ['banners', 'list', params] as const,
    detail: (id: number) => ['banners', 'detail', id] as const,
  },
  events: {
    all: ['events'] as const,
    list: (params?: ListParams) => ['events', 'list', params] as const,
    detail: (id: number) => ['events', 'detail', id] as const,
    related: (id: number) => ['events', 'related', id] as const,
  },
  staff: {
    all: ['staff'] as const,
    list: (params?: StaffListParams) => ['staff', 'list', params] as const,
    detail: (id: number) => ['staff', 'detail', id] as const,
  },
  history: {
    all: ['history'] as const,
    list: (params?: HistoryListParams) => ['history', 'list', params] as const,
    detail: (id: number) => ['history', 'detail', id] as const,
    years: ['history', 'years'] as const,
  },
  settings: ['settings'] as const,
  taxonomies: {
    sermonCategories: ['taxonomies', 'sermon_category'] as const,
    sermonPreachers: ['taxonomies', 'dw_sermon_preacher'] as const,
    bannerCategories: ['taxonomies', 'banner_category'] as const,
    albumCategories: ['taxonomies', 'album_category'] as const,
    staffDepartments: ['taxonomies', 'dw_staff_department'] as const,
  },
} as const;

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ─── Bulletin Hooks ─────────────────────────────────────────
export function useBulletins(params?: ListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Bulletin>>({
    queryKey: queryKeys.bulletins.list(params),
    queryFn: () => client.getBulletins(params),
    staleTime: STALE_TIME,
  });
}

export function useBulletin(id: number) {
  const client = useDWChurchClient();
  return useQuery<Bulletin>({
    queryKey: queryKeys.bulletins.detail(id),
    queryFn: () => client.getBulletin(id),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useRelatedBulletins(id: number, limit = 4) {
  const client = useDWChurchClient();
  return useQuery<Bulletin[]>({
    queryKey: queryKeys.bulletins.related(id),
    queryFn: () => client.getRelatedBulletins(id, limit),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Sermon Hooks ───────────────────────────────────────────
export function useSermons(params?: SermonListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Sermon>>({
    queryKey: queryKeys.sermons.list(params),
    queryFn: () => client.getSermons(params),
    staleTime: STALE_TIME,
  });
}

export function useSermon(id: number) {
  const client = useDWChurchClient();
  return useQuery<Sermon>({
    queryKey: queryKeys.sermons.detail(id),
    queryFn: () => client.getSermon(id),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useRelatedSermons(
  id: number,
  options?: { taxonomy?: string; limit?: number },
) {
  const client = useDWChurchClient();
  return useQuery<Sermon[]>({
    queryKey: queryKeys.sermons.related(id, options?.taxonomy),
    queryFn: () => client.getRelatedSermons(id, options),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Column Hooks ───────────────────────────────────────────
export function useColumns(params?: ListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Column>>({
    queryKey: queryKeys.columns.list(params),
    queryFn: () => client.getColumns(params),
    staleTime: STALE_TIME,
  });
}

export function useColumn(id: number) {
  const client = useDWChurchClient();
  return useQuery<Column>({
    queryKey: queryKeys.columns.detail(id),
    queryFn: () => client.getColumn(id),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useRelatedColumns(id: number, limit = 4) {
  const client = useDWChurchClient();
  return useQuery<Column[]>({
    queryKey: queryKeys.columns.related(id),
    queryFn: () => client.getRelatedColumns(id, limit),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Album Hooks ────────────────────────────────────────────
export function useAlbums(params?: ListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Album>>({
    queryKey: queryKeys.albums.list(params),
    queryFn: () => client.getAlbums(params),
    staleTime: STALE_TIME,
  });
}

export function useAlbum(id: number) {
  const client = useDWChurchClient();
  return useQuery<Album>({
    queryKey: queryKeys.albums.detail(id),
    queryFn: () => client.getAlbum(id),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useRelatedAlbums(id: number, limit = 4) {
  const client = useDWChurchClient();
  return useQuery<Album[]>({
    queryKey: queryKeys.albums.related(id),
    queryFn: () => client.getRelatedAlbums(id, limit),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Banner Hooks ───────────────────────────────────────────
export function useBanners(params?: BannerListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Banner>>({
    queryKey: queryKeys.banners.list(params),
    queryFn: () => client.getBanners(params),
    staleTime: STALE_TIME,
  });
}

export function useActiveBanners(category?: 'main' | 'sub') {
  return useBanners({ category, active: true });
}

export function useBanner(id: number) {
  const client = useDWChurchClient();
  return useQuery<Banner>({
    queryKey: queryKeys.banners.detail(id),
    queryFn: () => client.getBanner(id),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Event Hooks ────────────────────────────────────────────
export function useEvents(params?: ListParams) {
  const client = useDWChurchClient();
  return useQuery<PaginatedResponse<Event>>({
    queryKey: queryKeys.events.list(params),
    queryFn: () => client.getEvents(params),
    staleTime: STALE_TIME,
  });
}

export function useEvent(id: number) {
  const client = useDWChurchClient();
  return useQuery<Event>({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => client.getEvent(id),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useRelatedEvents(id: number, limit = 4) {
  const client = useDWChurchClient();
  return useQuery<Event[]>({
    queryKey: queryKeys.events.related(id),
    queryFn: () => client.getRelatedEvents(id, limit),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

// ─── Staff Hooks ────────────────────────────────────────────
export function useStaff(params?: StaffListParams) {
  const client = useDWChurchClient();
  return useQuery<Staff[]>({
    queryKey: queryKeys.staff.list(params),
    queryFn: () => client.getStaff(params),
    staleTime: STALE_TIME,
  });
}

export function useStaffMember(id: number) {
  const client = useDWChurchClient();
  return useQuery<Staff>({
    queryKey: queryKeys.staff.detail(id),
    queryFn: () => client.getStaffMember(id),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateStaff() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Staff, 'id'>) => client.createStaff(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
  });
}

export function useUpdateStaff() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Staff> }) =>
      client.updateStaff(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
  });
}

export function useDeleteStaff() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.deleteStaff(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
  });
}

export function useReorderStaff() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: number[]) => client.reorderStaff(orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
  });
}

// ─── History Hooks ──────────────────────────────────────────
export function useHistory(params?: HistoryListParams) {
  const client = useDWChurchClient();
  return useQuery<History[]>({
    queryKey: queryKeys.history.list(params),
    queryFn: () => client.getHistory(params),
    staleTime: STALE_TIME,
  });
}

export function useHistoryEntry(id: number) {
  const client = useDWChurchClient();
  return useQuery<History>({
    queryKey: queryKeys.history.detail(id),
    queryFn: () => client.getHistoryEntry(id),
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useHistoryYears() {
  const client = useDWChurchClient();
  return useQuery<number[]>({
    queryKey: queryKeys.history.years,
    queryFn: () => client.getHistoryYears(),
    staleTime: STALE_TIME,
  });
}

export function useCreateHistory() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<History, 'id'>) => client.createHistory(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.history.all }),
  });
}

export function useUpdateHistory() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<History> }) =>
      client.updateHistory(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.history.all }),
  });
}

export function useDeleteHistory() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.deleteHistory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.history.all }),
  });
}

// ─── Settings Hooks ─────────────────────────────────────────
export function useChurchSettings() {
  const client = useDWChurchClient();
  return useQuery<ChurchSettings>({
    queryKey: queryKeys.settings,
    queryFn: () => client.getSettings(),
    staleTime: STALE_TIME,
  });
}

export function useUpdateChurchSettings() {
  const client = useDWChurchClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ChurchSettings>) => client.updateSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
  });
}

// ─── Related Posts (generic) ────────────────────────────────
export function useRelatedPosts<T>(params: RelatedPostsParams) {
  const client = useDWChurchClient();
  return useQuery<T[]>({
    queryKey: ['related', params.postType, params.currentId, params.taxonomy],
    queryFn: () => client.getRelatedPosts<T>(params),
    enabled: !!params.currentId,
    staleTime: STALE_TIME,
  });
}

// ─── Taxonomy Hooks ─────────────────────────────────────────
export function useSermonCategories() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.sermonCategories,
    queryFn: () => client.getSermonCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes (taxonomies change rarely)
  });
}

export function useSermonPreachers() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.sermonPreachers,
    queryFn: () => client.getSermonPreachers(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useBannerCategories() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.bannerCategories,
    queryFn: () => client.getBannerCategories(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useAlbumCategories() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.albumCategories,
    queryFn: () => client.getAlbumCategories(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useStaffDepartments() {
  const client = useDWChurchClient();
  return useQuery<TaxonomyTerm[]>({
    queryKey: queryKeys.taxonomies.staffDepartments,
    queryFn: () => client.getStaffDepartments(),
    staleTime: 30 * 60 * 1000,
  });
}
