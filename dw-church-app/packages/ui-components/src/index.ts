// ─── Provider ───────────────────────────────────────────────
export { DWChurchProvider, type DWChurchProviderProps } from './provider/DWChurchProvider';

// ─── Common Components ──────────────────────────────────────
export { LoadingSpinner, type LoadingSpinnerProps } from './components/common/LoadingSpinner';
export { EmptyState, type EmptyStateProps } from './components/common/EmptyState';
export { ErrorBoundary, type ErrorBoundaryProps } from './components/common/ErrorBoundary';
export { DateBadge, type DateBadgeProps } from './components/common/DateBadge';
export { YoutubeEmbed, type YoutubeEmbedProps } from './components/common/YoutubeEmbed';
export { PostNavigation, type PostNavigationProps } from './components/common/PostNavigation';
export { ImageGallery, type ImageGalleryProps } from './components/common/ImageGallery';
export { RelatedPosts, type RelatedPostsProps } from './components/common/RelatedPosts';
export { PdfViewer, type PdfViewerProps } from './components/common/PdfViewer';
export { Pagination, type PaginationProps } from './components/common/Pagination';

// ─── Bulletin Components ────────────────────────────────────
export { BulletinList } from './components/bulletin/BulletinList';
export { BulletinCard } from './components/bulletin/BulletinCard';
export { SingleBulletin } from './components/bulletin/SingleBulletin';

// ─── Sermon Components ──────────────────────────────────────
export { SermonList } from './components/sermon/SermonList';
export { SermonCard } from './components/sermon/SermonCard';
export { SingleSermon } from './components/sermon/SingleSermon';
export { SermonFilter } from './components/sermon/SermonFilter';
export { RelatedSermons } from './components/sermon/RelatedSermons';

// ─── Column Components ──────────────────────────────────────
export { ColumnGrid } from './components/column/ColumnGrid';
export { PastoralColumn } from './components/column/PastoralColumn';

// ─── Album Components ───────────────────────────────────────
export { GalleryGrid } from './components/album/GalleryGrid';
export { AlbumCard } from './components/album/AlbumCard';
export { SingleAlbum } from './components/album/SingleAlbum';
export { RecentGallery } from './components/album/RecentGallery';

// ─── Banner Components ──────────────────────────────────────
export { BannerSlider } from './components/banner/BannerSlider';
export { BannerGrid } from './components/banner/BannerGrid';

// ─── Event Components ───────────────────────────────────────
export { EventCard } from './components/event/EventCard';
export { EventGrid } from './components/event/EventGrid';
export { SingleEvent } from './components/event/SingleEvent';

// ─── Staff Components ───────────────────────────────────────
export { StaffGrid } from './components/staff/StaffGrid';
export { StaffCard } from './components/staff/StaffCard';
export { StaffProfile } from './components/staff/StaffProfile';
export { StaffDepartmentTabs } from './components/staff/StaffDepartmentTabs';

// ─── History Components ─────────────────────────────────────
export { HistoryTimeline } from './components/history/HistoryTimeline';
export { HistoryYearSection } from './components/history/HistoryYearSection';
export { HistoryYearTabs } from './components/history/HistoryYearTabs';
export { HistoryItem as HistoryItemComponent } from './components/history/HistoryItem';

// ─── Re-export API Client types and hooks for convenience ───
export {
  useBulletins,
  useBulletin,
  useRelatedBulletins,
  useSermons,
  useSermon,
  useRelatedSermons,
  useColumns,
  useColumn,
  useRelatedColumns,
  useAlbums,
  useAlbum,
  useRelatedAlbums,
  useBanners,
  useActiveBanners,
  useBanner,
  useEvents,
  useEvent,
  useRelatedEvents,
  useStaff,
  useStaffMember,
  useHistory,
  useHistoryEntry,
  useHistoryYears,
  useChurchSettings,
  useRelatedPosts,
  useSermonCategories,
  useSermonPreachers,
  useAlbumCategories,
  useStaffDepartments,
} from '@dw-church/api-client';
