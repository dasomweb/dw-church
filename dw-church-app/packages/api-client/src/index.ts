// Client
export { DWChurchClient, DWChurchApiError } from './client';
export { MockAdapter } from './mock';

// Types
export type {
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
} from './types';

// React Hooks
export {
  DWChurchClientContext,
  useDWChurchClient,
  queryKeys,
  // Bulletins
  useBulletins,
  useBulletin,
  useRelatedBulletins,
  // Sermons
  useSermons,
  useSermon,
  useRelatedSermons,
  // Columns
  useColumns,
  useColumn,
  useRelatedColumns,
  // Albums
  useAlbums,
  useAlbum,
  useRelatedAlbums,
  // Banners
  useBanners,
  useActiveBanners,
  useBanner,
  // Events
  useEvents,
  useEvent,
  useRelatedEvents,
  // Staff
  useStaff,
  useStaffMember,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useReorderStaff,
  // History
  useHistory,
  useHistoryEntry,
  useHistoryYears,
  useCreateHistory,
  useUpdateHistory,
  useDeleteHistory,
  // Settings
  useChurchSettings,
  useUpdateChurchSettings,
  // Related Posts
  useRelatedPosts,
  // Taxonomies
  useSermonCategories,
  useSermonPreachers,
  useBannerCategories,
  useAlbumCategories,
  useStaffDepartments,
} from './hooks';
