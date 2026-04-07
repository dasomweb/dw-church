// ─── Bulletin ───────────────────────────────────────────────
export interface Bulletin {
  id: string;
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
  id: string;
  title: string;
  youtubeUrl: string;
  scripture: string;
  preacher: string;
  date: string;
  thumbnailUrl: string;
  categoryIds: string[];
  category: string;
  status: PostStatus;
  createdAt: string;
  modifiedAt: string;
}

// ─── Column (Pastoral Column) ───────────────────────────────
export interface Column {
  id: string;
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
  id: string;
  title: string;
  images: string[];
  youtubeUrl: string;
  thumbnailUrl: string;
  categoryIds: string[];
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
  id: string;
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
  id: string;
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
  id: string;
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
  id: string;
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

// ─── Board (게시판) ──────────────────────────────────────���──
export interface Board {
  id: string;
  title: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardPostAttachment {
  url: string;
  filename: string;
  size?: number;
  type?: string;
}

export interface BoardPost {
  id: string;
  boardId: string;
  title: string;
  authorName: string;
  content: string;
  attachments: BoardPostAttachment[];
  viewCount: number;
  isPinned: boolean;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BoardPostListParams extends ListParams {
  boardId: string;
}

// ─── Common Types ───────────────────────────────────────────
export type PostStatus = 'published' | 'draft' | 'archived';

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
  preacher?: string;
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
  currentId: string;
  taxonomy?: string;
  termIds?: string[];
  limit?: number;
}

// ─── Taxonomy ───────────────────────────────────────────────
export interface TaxonomyTerm {
  id: string;
  name: string;
  slug: string;
  count: number;
  parentId?: string;
}

// ─── Page System ────────────────────────────────────────────
/** Block type string — extensible via @dw-church/design-blocks registry. */
export type BlockType = string;

export interface PageSection {
  id: string;
  pageId: string;
  blockType: BlockType;
  props: Record<string, unknown>;
  sortOrder: number;
  isVisible: boolean;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  status: 'draft' | 'published';
  sortOrder: number;
  sections: PageSection[];
}

export interface MenuItem {
  id: string;
  label: string;
  pageId?: string | null;
  pageSlug?: string | null;
  externalUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isVisible: boolean;
  children?: MenuItem[];
}

export interface Theme {
  id: string;
  templateName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: { heading: string; body: string };
  customCss: string;
}

export interface TemplatePreset {
  name: string;
  label: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: {
    headerStyle: 'default' | 'centered' | 'transparent' | 'dark';
    heroStyle: 'full' | 'split' | 'minimal' | 'overlay' | 'none';
    contentWidth: 'narrow' | 'default' | 'wide' | 'full';
    cardStyle: 'shadow' | 'border' | 'flat' | 'elevated';
    footerStyle: 'default' | 'minimal' | 'centered' | 'dark';
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    sermonGrid: 2 | 3 | 4;
  };
}

// ─── Auth Types ─────────────────────────────────────────────
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  tenantSlug: string;
  role: 'owner' | 'admin' | 'editor';
  isSuperAdmin?: boolean;
}

export interface RegisterInput {
  churchName: string;
  slug: string;
  email: string;
  password: string;
  ownerName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── Tenant ─────────────────────────────────────────────────
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: 'free' | 'basic' | 'pro';
  customDomain?: string;
  logoUrl?: string;
  templateName: string;
  isActive: boolean;
}

// ─── File Upload ────────────────────────────────────────────
export interface UploadedFile {
  id: string;
  url: string;
}

// ─── Auth / Client Config ───────────────────────────────────
export interface ClientConfig {
  baseUrl: string;
  token?: string;
  tenantSlug?: string;
  adapter?: ApiAdapter;
}

export interface ApiAdapter {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: unknown): Promise<T>;
  put<T>(url: string, data?: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
}
