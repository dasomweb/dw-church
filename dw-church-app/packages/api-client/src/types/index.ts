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

// ─── Online Bulletin (온라인 주보) ───────────────────────────
// 문서 업로드형 Bulletin 과 별개. content 에 예배순서·찬양악보·대표기도·성경본문·
// 기도제목·마지막찬양·주일광고·소그룹질문을 담아 스크롤로 표시.
// lyrics = 악보 이미지 아래에 텍스트로 표시하는 가사(모바일에서 악보가 안 보일 때 대비). note = 소메모.
// lyricsEn = 가사 영어(선택) — 사이트 한/영 토글로 전환.
export interface OnlineHymn { title: string; hymnNo: string; imageUrls: string[]; note: string; lyrics?: string; lyricsEn?: string }
export interface OnlineBulletinContent {
  serviceTitle?: string;
  presider?: string;
  // 예배 순서 — 항목별 한/영(영어 선택).
  worshipOrder?: { label: string; detail: string; person: string; labelEn?: string; detailEn?: string; personEn?: string }[];
  hymns?: OnlineHymn[];
  // 대표기도 — 한/영(영어 선택).
  representativePrayer?: { person: string; content: string; personEn?: string; contentEn?: string };
  // 성경 본문 — 한/영 병기(영어는 선택). referenceEn/textEn 이 있으면 사이트에서 한/영 토글.
  scripture?: { reference: string; text: string; referenceEn?: string; textEn?: string };
  // 설교 노트 — 문서형(마크다운: 제목/소제목/불릿/인용). text=한국어, textEn=영어(선택).
  sermonNote?: { title?: string; text?: string; textEn?: string };
  // 어린이 설교 노트 — 성인 설교 노트와 동일 구조(마크다운). 성경 본문 아래, 성인 노트 다음.
  childrenSermonNote?: { title?: string; text?: string; textEn?: string };
  // 어린이 설교 요약 카툰 — 어린이 설교 노트 아래. 한국어/영어 각각 이미지(패널) 업로드(R2).
  // imageUrls=한국어 카툰, imageUrlsEn=영어 카툰. 사이트 한/영 토글로 전환(영어 없으면 한국어 폴백).
  childrenCartoon?: { imageUrls?: string[]; imageUrlsEn?: string[]; caption?: string; captionEn?: string };
  // 기도 제목 — 항목별 한/영(영어 선택).
  prayerRequests?: { title: string; detail: string; titleEn?: string; detailEn?: string }[];
  closingHymn?: OnlineHymn;
  // 교회소식(구 주일광고) — 항목별 한/영(영어 선택).
  announcements?: { title: string; body: string; titleEn?: string; bodyEn?: string }[];
  // 소그룹 나눔 질문 — 관찰/상관/적용 각각 한글 배열 + (선택) 영어 배열(같은 순서로 짝).
  study?: {
    observation: string[]; correlation: string[]; application: string[];
    observationEn?: string[]; correlationEn?: string[]; applicationEn?: string[];
  };
}
export interface OnlineBulletin {
  id: string;
  title: string;
  serviceDate: string;
  content: OnlineBulletinContent;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Sermon ─────────────────────────────────────────────────
/** 설교 본문 구성 — 한 '단'(섹션): 소제목 + 본문(HTML) + 사진 + 캡션 + 대체텍스트. */
export interface SermonBodySection {
  subtitle?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  caption?: string | null;
  alt?: string | null;
}

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
  // 설교 스터디 (13a 설교 매거진) — 한줄요약·써머리 + 질문 3종(문자열 배열)
  oneLineSummary?: string | null;
  summary?: string | null;
  observationQuestions?: string[];
  deepQuestions?: string[];
  applicationQuestions?: string[];
  // 리디자인 — 메타 + 본문 구성 + 게시
  subtitle?: string | null;
  serviceType?: string | null;   // 예배 구분
  series?: string | null;
  slug?: string | null;
  tags?: string[];
  language?: string | null;
  seoSummary?: string | null;
  body?: SermonBodySection[];    // 본문 구성(멀티 섹션)
  videoStartAt?: string | null;  // 영상 시작 지점
  scheduledAt?: string | null;   // 공개 예약(ISO)
  homeFeatured?: boolean;        // 홈 대표글
  allowComments?: boolean;       // 댓글 허용
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

// ─── Video (영상 게시판) ─────────────────────────────────────
export interface Video {
  id: string;
  title: string;
  youtubeUrl: string;
  videoDate: string;
  thumbnailUrl: string;
  categoryId: string;
  categoryName?: string;
  status: PostStatus;
  createdAt: string;
}

export interface VideoCategory {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

// ─── YouTube import (가져오기) ───────────────────────────────
/** A selectable import source on a channel: whole uploads, a playlist, or live. */
export interface YoutubeSource {
  type: 'uploads' | 'playlist' | 'live';
  id: string;          // playlist id (uploads/playlist) or channel id (live)
  title: string;
  count: number | null; // item count when known
}

/** One importable video; scripture/sermonDate are best-effort extracted. */
export interface YoutubeImportVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  url: string;
  thumbnailUrl: string;
  scripture: string;
  sermonDate: string;
  alreadyImported?: boolean;
}

// ─── Schedule (예배 및 모임) ─────────────────────────────────
// Each row is a titled GROUP: columns[] are the 3 header strings, rows[][]
// is a string[][] where each inner array is one row matching the columns.
export interface Schedule {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
  sortOrder: number;
  status: PostStatus;
  createdAt: string;
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
  | 'right-bottom'
  // Position-first aliases used by the admin banner editor (additive — keeps existing literals valid)
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type BannerAlign = 'left' | 'center' | 'right';
export type BannerCategory = 'main' | 'sub';
export type LinkTarget = '_self' | '_blank';

export interface BannerTextOverlay {
  heading: string;
  subheading: string;
  description: string;
  // Optional CTA button — written by the admin banner editor, read by BannerSlider.
  buttonText?: string;
  buttonUrl?: string;
  position: BannerPosition;
  align: BannerAlign;
  // Tenant-toggleable dark overlay (scrim) for THIS banner. Default on (undefined
  // → treated as true); set false to show the image with no dark overlay.
  overlayEnabled?: boolean;
  // Optional — the admin banner editor doesn't author per-breakpoint widths;
  // BannerSlider falls back to defaults when absent.
  widths?: {
    pc: string;
    laptop: string;
    tablet: string;
    mobile: string;
  };
}

export interface Banner {
  id: string;
  title: string;
  // Empty image / link / date fields are sent as null by the admin editor
  // (formData.x || null) and cleared as null server-side — nullable, not ''.
  pcImageUrl: string | null;
  mobileImageUrl: string | null;
  subImageUrl: string | null;
  linkUrl: string | null;
  linkTarget: LinkTarget;
  startDate: string | null;
  endDate: string | null;
  textOverlay: BannerTextOverlay;
  category: BannerCategory;
  status: PostStatus;
  sortOrder?: number;
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

// ─── Verse (오늘의 말씀) ─────────────────────────────────────
export interface Verse {
  id: string;
  text: string;
  reference: string;
  verseDate: string | null;
  sortOrder: number;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── i18n (영어 번역 보정) ──────────────────────────────────
export interface TranslationRow {
  source: string;
  text: string;
  isOverride: boolean;
  updatedAt: string;
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

// ─── Cell (목장/셀) ──────────────────────────────────────────
export interface Cell {
  id: string;
  name: string;
  leaderName?: string | null;
  leaderRole?: string | null;
  region?: string | null;
  meetingDay?: string | null;
  meetingTime?: string | null;
  location?: string | null;
  contact?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
}

// ─── Newcomer (새가족 등록) ──────────────────────────────────
export type NewcomerStatus = 'new' | 'contacted' | 'registered' | 'archived';

export interface Newcomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  prevChurch?: string | null;
  visitPath?: string | null;
  faithStatus?: string | null;
  familyInfo?: string | null;
  prayerRequest?: string | null;
  scanImageUrl?: string | null; // 종이 신청서 스캔 사진(R2)
  status?: NewcomerStatus;
  memo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// The public intake form submits only the visitor-facing fields.
export type NewcomerSubmission = Omit<Newcomer, 'id' | 'status' | 'memo' | 'createdAt' | 'updatedAt'>;

// ─── Devotion (말씀 묵상 / QT) ───────────────────────────────
// 읽기 전용 콘텐츠(사용자 트래킹 없음). 저작권상 성경 본문 전문은 저장 안 함 —
// scriptureRef(참조) + 창작 묵상(reflection/question/prayer)만.
export interface Devotion {
  id: string;
  title: string;
  devoDate?: string | null;
  dayLabel?: string | null;
  scriptureRef?: string | null;
  verse?: string | null;
  reflection?: string | null;
  question?: string | null;
  prayer?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  status?: PostStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Cardnews (카드뉴스) ─────────────────────────────────────
// 한 주제를 여러 4:5 이미지 카드로 넘겨 보는 "덱" 콘텐츠(관리자 업로드, 공개 읽기).
// 표지=imageUrl=첫 카드. 레거시 flat 행은 cards 가 비어 있고 imageUrl 만 있음.
export interface CardnewsCard {
  imageUrl: string;
  caption?: string;
}
export interface Cardnews {
  id: string;
  title: string;
  category?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  cards?: CardnewsCard[];   // 덱을 이루는 카드들(이미지+캡션)
  sortOrder?: number;
  status?: PostStatus;
  createdAt?: string;
  updatedAt?: string;
}

// 정착 히스토리 — 새가족 한 명의 후속 기록(연락/심방/상담/모임/정착/기타)
export type NewcomerHistoryType = 'contact' | 'visit' | 'counsel' | 'meeting' | 'settled' | 'etc';

export interface NewcomerHistoryEntry {
  id: string;
  newcomerId: string;
  entryDate: string; // 기록 일자
  type: NewcomerHistoryType;
  content: string;
  author?: string | null;
  createdAt?: string;
}

export type NewcomerHistoryInput = {
  entryDate: string;
  type: NewcomerHistoryType;
  content: string;
  author?: string | null;
};

// ─── Form submissions (문의 / 목장사역보고서 / 커스텀 폼) ─────────────
// Generic content module: one record per storefront-form submission. `payload`
// holds the raw field answers (the form's fields are defined by the block).
// Foundation for the future 교적관리 (membership) system.
export type FormSubmissionStatus = 'new' | 'read' | 'done' | 'archived';

export interface FormSubmission {
  id: string;
  formType: string;
  submitterName?: string | null;
  submitterContact?: string | null;
  payload: Record<string, unknown>;
  status?: FormSubmissionStatus;
  memo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Form Builder (운영자가 설계하는 커스텀 폼: 목장보고서/새가족/문의 …) ──
// A `Form` (forms 테이블) defines a custom form; its `FormField`s define the
// inputs. Submissions reuse FormSubmission (form_type = the form's slug) so they
// land in the existing 폼 제출 inbox.
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  formId: string;
  sortOrder: number;
  fieldKey: string;
  fieldType: FormFieldType;
  label: string;
  placeholder: string;
  helpText: string;
  isRequired: boolean;
  options: FormFieldOption[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Form {
  id: string;
  name: string;
  slug: string;
  description: string;
  submitLabel: string;
  successMessage: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormWithFields {
  form: Form;
  fields: FormField[];
}

export type CreateFormInput = Pick<Form, 'name' | 'slug'> &
  Partial<Pick<Form, 'description' | 'submitLabel' | 'successMessage' | 'isActive' | 'sortOrder'>>;
export type UpdateFormInput = Partial<Omit<Form, 'id' | 'slug' | 'createdAt' | 'updatedAt'>>;
export type CreateFormFieldInput = Pick<FormField, 'fieldKey' | 'fieldType' | 'label'> &
  Partial<Pick<FormField, 'placeholder' | 'helpText' | 'isRequired' | 'sortOrder' | 'options'>>;
export type UpdateFormFieldInput = Partial<Omit<FormField, 'id' | 'formId' | 'createdAt' | 'updatedAt'>>;

// ─── Church Settings ────────────────────────────────────────
export interface ChurchSettings {
  churchName: string;
  churchAddress: string;
  churchPhone: string;
  churchEmail: string;
  churchWebsite: string;
  // Branding
  logoUrl: string;
  faviconUrl: string;
  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImageUrl: string;
  // SNS
  socialYoutube: string;
  socialInstagram: string;
  socialFacebook: string;
  socialLinkedin: string;
  socialTiktok: string;
  socialKakaotalk: string;
  socialKakaotalkChannel: string;
  [key: string]: unknown;
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
  /** 분류 (친교/교육/구역 등). 교회소식 게시판에서 사용. */
  category: string;
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
  featured?: boolean;  // 홈 대표글만
}

export interface VideoListParams extends ListParams {
  category?: string;
  categoryId?: string;
}

export interface ScheduleListParams {
  status?: PostStatus;
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

/** A managed category row (sermon/album/video) — the editable id/name/slug
 * triple returned by the dedicated *-categories CRUD endpoints. */
export interface Category {
  id: string;
  name: string;
  slug: string;
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
  /** 영문 병기 라벨 (한인 이민교회 한·영 네비게이션). */
  labelEn?: string | null;
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
  role: 'owner' | 'admin' | 'editor' | 'staff' | 'member';
  isSuperAdmin?: boolean;
  // Scoped-staff RBAC: capability list (role='staff') + linked 교적 member.
  permissions?: string[];
  memberId?: string | null;
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
