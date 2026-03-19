// ─── Bulletin ───────────────────────────────────────────────
export interface Bulletin {
  id: number;
  title: string;
  date: string;
  pdfUrl: string;
  images: string[];
  thumbnailUrl: string;
  status: PostStatus;
  createdAt: string;
  modifiedAt: string;
}

// ─── Sermon ─────────────────────────────────────────────────
export interface Sermon {
  id: number;
  title: string;
  youtubeUrl: string;
  scripture: string;
  preacher: string;
  date: string;
  thumbnailUrl: string;
  categoryIds: number[];
  category: string;
  status: PostStatus;
  createdAt: string;
  modifiedAt: string;
}

// ─── Column (Pastoral Column) ───────────────────────────────
export interface Column {
  id: number;
  title: string;
  content: string;
  topImageUrl: string;
  bottomImageUrl: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  status: PostStatus;
  createdAt: string;
  modifiedAt: string;
}

// ─── Album ──────────────────────────────────────────────────
export interface Album {
  id: number;
  title: string;
  images: string[];
  youtubeUrl: string;
  thumbnailUrl: string;
  categoryIds: number[];
  status: PostStatus;
  createdAt: string;
  modifiedAt: string;
}

// ─── Banner ─────────────────────────────────────────────────
export type BannerPosition =
  | 'left-top'
  | 'center-top'
  | 'right-top'
  | 'left-center'
  | 'center-center'
  | 'right-center'
  | 'left-bottom'
  | 'center-bottom'
  | 'right-bottom';

export type BannerAlign = 'left' | 'center' | 'right';
export type BannerCategory = 'main' | 'sub';
export type LinkTarget = '_self' | '_blank';

export interface BannerTextOverlay {
  heading: string;
  subheading: string;
  description: string;
  position: BannerPosition;
  align: BannerAlign;
  widths: {
    pc: string;
    laptop: string;
    tablet: string;
    mobile: string;
  };
}

export interface Banner {
  id: number;
  title: string;
  pcImageUrl: string;
  mobileImageUrl: string;
  subImageUrl: string;
  linkUrl: string;
  linkTarget: LinkTarget;
  startDate: string;
  endDate: string;
  textOverlay: BannerTextOverlay;
  category: BannerCategory;
  status: PostStatus;
  createdAt: string;
  modifiedAt: string;
}

// ─── Event ──────────────────────────────────────────────────
export interface Event {
  id: number;
  title: string;
  backgroundImageUrl: string;
  imageOnly: boolean;
  department: string;
  eventDate: string;
  location: string;
  linkUrl: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  status: PostStatus;
  createdAt: string;
  modifiedAt: string;
}

// ─── Staff (New) ────────────────────────────────────────────
export interface StaffSnsLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface Staff {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  bio: string;
  order: number;
  photoUrl: string;
  snsLinks: StaffSnsLinks;
  isActive: boolean;
}

// ─── History (New) ──────────────────────────────────────────
export interface HistoryItem {
  id: string;
  month: number;
  day: number;
  content: string;
  photoUrl: string;
}

export interface History {
  id: number;
  year: number;
  items: HistoryItem[];
}

// ─── Church Settings ────────────────────────────────────────
export interface ChurchSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  socialYoutube: string;
  socialInstagram: string;
  socialFacebook: string;
  socialLinkedin: string;
  socialTiktok: string;
  socialKakaotalk: string;
  socialKakaotalkChannel: string;
}

// ─── Common Types ───────────────────────────────────────────
export type PostStatus = 'publish' | 'draft' | 'pending' | 'private' | 'trash';

export type PostType =
  | 'bulletin'
  | 'sermon'
  | 'column'
  | 'album'
  | 'banner'
  | 'event'
  | 'dw_staff'
  | 'dw_history';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export interface ListParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
  status?: PostStatus;
}

export interface SermonListParams extends ListParams {
  category?: string;
  preacher?: number;
}

export interface BannerListParams extends ListParams {
  category?: BannerCategory;
  active?: boolean;
}

export interface StaffListParams extends ListParams {
  department?: string;
  activeOnly?: boolean;
}

export interface HistoryListParams {
  year?: number;
}

export interface RelatedPostsParams {
  postType: PostType;
  currentId: number;
  taxonomy?: string;
  termIds?: number[];
  limit?: number;
}

// ─── Taxonomy ───────────────────────────────────────────────
export interface TaxonomyTerm {
  id: number;
  name: string;
  slug: string;
  count: number;
  parentId?: number;
}

// ─── Auth ───────────────────────────────────────────────────
export interface AuthConfig {
  username: string;
  password: string;
}

export interface ClientConfig {
  baseUrl: string;
  auth?: AuthConfig;
  adapter?: ApiAdapter;
}

export interface ApiAdapter {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: unknown): Promise<T>;
  put<T>(url: string, data?: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
}
