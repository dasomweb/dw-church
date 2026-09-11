/**
 * Migration System — Single Source of Truth for all type definitions.
 * See /MIGRATION.md for full architecture documentation.
 */

// ─── Job Status ��────────────────────────────────────────────

export type MigrationStatus =
  | 'draft'
  | 'extracting'
  | 'extracted'
  | 'classifying'
  | 'classified'
  | 'approved'
  | 'applying'
  | 'done'
  | 'failed';

// ─── Migration Job (persisted in migration_jobs table) ──────

export interface MigrationJob {
  id: string;
  tenantSlug: string;
  sourceUrl: string | null;
  youtubeChannelUrl: string | null;
  status: MigrationStatus;
  rawData: RawExtractedData;
  classifiedData: ClassifiedData;
  applyResult: ApplyResult;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Raw Extracted Data (output of extractors) ──────────────

/**
 * SEO metadata captured from a page's <head>. All fields optional —
 * absence simply means the source page didn't set it. Used by
 * classifier.ts to seed church_info + site_settings so the migrated
 * tenant carries the source site's SEO posture (see
 * project_migration_seo_extraction).
 */
export interface RawPageSeo {
  titleTag: string;            // <title>
  metaDescription: string;     // <meta name="description">
  metaKeywords: string;        // <meta name="keywords">
  metaAuthor: string;          // <meta name="author">
  metaGenerator: string;       // <meta name="generator">  (WordPress signal)
  canonical: string;           // <link rel="canonical">
  faviconUrl: string;          // <link rel="icon|shortcut icon">
  appleTouchIconUrl: string;   // <link rel="apple-touch-icon">
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogSiteName: string;
  ogType: string;
  ogLocale: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterCard: string;
  // JSON-LD Organization-like blocks (Yoast usually emits these on WordPress).
  // Parsed but kept as flat strings so downstream classifier need not
  // re-parse.
  ldName: string;
  ldUrl: string;
  ldLogo: string;
  ldTelephone: string;
  ldEmail: string;
  ldAddress: string;
  // WordPress hint: presence of `<link rel="https://api.w.org/">`.
  isWordPress: boolean;
}

export function emptyRawPageSeo(): RawPageSeo {
  return {
    titleTag: '', metaDescription: '', metaKeywords: '', metaAuthor: '',
    metaGenerator: '', canonical: '', faviconUrl: '', appleTouchIconUrl: '',
    ogTitle: '', ogDescription: '', ogImage: '', ogUrl: '', ogSiteName: '',
    ogType: '', ogLocale: '',
    twitterTitle: '', twitterDescription: '', twitterImage: '', twitterCard: '',
    ldName: '', ldUrl: '', ldLogo: '', ldTelephone: '', ldEmail: '', ldAddress: '',
    isWordPress: false,
  };
}

export interface RawPage {
  url: string;
  title: string;
  textContent: string;
  images: string[];
  links: { text: string; href: string }[];
  /** Phase 12-γ.2 (2026-06-03) — head/SEO metadata. Optional for
   *  backwards-compat with already-persisted jobs; new scrapes always
   *  populate it via emptyRawPageSeo(). */
  seo?: RawPageSeo;
}

export interface RawYouTubeVideo {
  title: string;
  videoId: string;
  date: string;
  thumbnailUrl: string;
}

export interface RawExtractedData {
  source: {
    url: string;
    type: 'html' | 'youtube' | 'manual';
    scrapedAt: string;
  };
  pages: RawPage[];
  youtubeVideos: RawYouTubeVideo[];
}

// ─── Classified Data (mapped to our data structure) ─────────

export interface ChurchInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  // Phase 12-γ.2 — SEO fields harvested from source <head>. Applied to
  // tenant settings so migrated site retains source's SEO posture
  // (project_migration_seo_extraction).
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImageUrl: string;
  logoUrl: string;
  locale: string;
  slogan: string;     // og:site_name short or homepage subtitle
}

export interface ClassifiedSermon {
  title: string;
  scripture: string;
  preacher: string;
  date: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  /** Original source post URL — idempotency key on re-import. Optional. */
  sourceUrl?: string;
}

export interface ClassifiedBulletin {
  title: string;
  date: string;
  pdfUrl: string;
  images: string[];
  /** Original source post URL — idempotency key on re-import. Optional. */
  sourceUrl?: string;
}

export interface ClassifiedColumn {
  title: string;
  content: string;
  topImageUrl: string;
  youtubeUrl: string;
  /** Publication / creation date from source site. ISO-ish (YYYY-MM-DD).
   *  Maps to columns_pastoral.created_at on apply so the migrated
   *  post keeps its original publish order. Empty string when not
   *  extractable. */
  date: string;
  /** Original source post URL (WP REST `link`). Used as the idempotency key on
   *  re-import (UPDATE the same row instead of inserting a duplicate). Optional
   *  — empty when not available. */
  sourceUrl?: string;
}

export interface ClassifiedEvent {
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl: string;
  /** Original source post URL — idempotency key on re-import. Optional. */
  sourceUrl?: string;
}

export interface ClassifiedAlbum {
  title: string;
  images: string[];
  youtubeUrl: string;
  /** Publication date from the source gallery (YYYY-MM-DD-ish). Maps to
   *  albums.created_at on apply so albums keep their original order.
   *  Empty when not extractable. */
  date?: string;
  /** Original source post URL — idempotency key on re-import. Optional. */
  sourceUrl?: string;
}

export interface ClassifiedBoardPost {
  title: string;
  content: string;
  author: string;
  date: string;
}

export interface ClassifiedBoard {
  boardSlug: string;
  boardTitle: string;
  posts: ClassifiedBoardPost[];
}

export interface ClassifiedStaff {
  name: string;
  role: string;
  department: string;
  photoUrl: string;
  bio: string;
}

export interface ClassifiedHistoryItem {
  year: number;
  month: string;
  title: string;
  description: string;
}

export interface ClassifiedWorshipTime {
  name: string;
  day: string;
  time: string;
  location: string;
}

export interface ClassifiedMenu {
  label: string;
  pageSlug: string;
  parentLabel: string | null;
  sortOrder: number;
}

/** STEP 3 (static/dynamic routing) — a page is either STATIC (its content is
 *  entered directly as block props: 인사말·소개·오시는 길) or DYNAMIC (a list
 *  page — 주보·앨범·설교·칼럼·행사·교역자·게시판 — that displays a Content
 *  Module's data through a Data Block). The review UI groups by this. */
export type PageKind = 'static' | 'dynamic';

/** The content module a DYNAMIC page's data block pulls from. Mirrors the
 *  dynamic IncludeKey set + 'history'. Empty for static pages. */
export type PageModuleType =
  | 'bulletins' | 'sermons' | 'albums' | 'columns'
  | 'events' | 'staff' | 'history' | 'boards';

export interface ClassifiedPageContent {
  pageSlug: string;
  /** STEP 3 — static page vs dynamic list page. Optional for backward-compat
   *  with already-persisted jobs; the agent/classifier now set it, and the
   *  review UI groups pages by it. When absent it's inferred from the page's
   *  first data-block type at review time. */
  pageKind?: PageKind;
  /** For a DYNAMIC page, which Content Module its data block displays. Lets the
   *  review screen show "이 페이지 → 이 모듈". Undefined for static pages. */
  moduleType?: PageModuleType;
  blocks: {
    blockType: string;
    props: Record<string, unknown>;
  }[];
}

export interface ClassifiedData {
  churchInfo: ChurchInfo;
  sermons: ClassifiedSermon[];
  bulletins: ClassifiedBulletin[];
  columns: ClassifiedColumn[];
  events: ClassifiedEvent[];
  albums: ClassifiedAlbum[];
  boards: ClassifiedBoard[];
  staff: ClassifiedStaff[];
  history: ClassifiedHistoryItem[];
  worshipTimes: ClassifiedWorshipTime[];
  menus: ClassifiedMenu[];
  pageContents: ClassifiedPageContent[];
  images: string[];
}

// ─── Apply Result ───────────────────────────────────────────

export interface ApplyResult {
  images: number;
  settings: number;
  staff: number;
  sermons: number;
  bulletins: number;
  columns: number;
  events: number;
  albums: number;
  history: number;
  boards: number;
  pages: number;
  worshipTimes: number;
  menus: number;
}

// ─── Empty defaults ─────────────────────────────────────────

export function emptyRawData(): RawExtractedData {
  return {
    source: { url: '', type: 'html', scrapedAt: '' },
    pages: [],
    youtubeVideos: [],
  };
}

export function emptyClassifiedData(): ClassifiedData {
  return {
    churchInfo: {
      name: '', address: '', phone: '', email: '', description: '',
      seoTitle: '', seoDescription: '', seoKeywords: '', ogImageUrl: '',
      logoUrl: '', locale: '', slogan: '',
    },
    sermons: [],
    bulletins: [],
    columns: [],
    events: [],
    albums: [],
    boards: [],
    staff: [],
    history: [],
    worshipTimes: [],
    menus: [],
    pageContents: [],
    images: [],
  };
}

export function emptyApplyResult(): ApplyResult {
  return {
    images: 0, settings: 0, staff: 0, sermons: 0, bulletins: 0,
    columns: 0, events: 0, albums: 0, history: 0, boards: 0,
    pages: 0, worshipTimes: 0, menus: 0,
  };
}
