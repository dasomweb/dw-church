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

export interface RawPage {
  url: string;
  title: string;
  textContent: string;
  images: string[];
  links: { text: string; href: string }[];
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
}

export interface ClassifiedSermon {
  title: string;
  scripture: string;
  preacher: string;
  date: string;
  youtubeUrl: string;
  thumbnailUrl: string;
}

export interface ClassifiedBulletin {
  title: string;
  date: string;
  pdfUrl: string;
  images: string[];
}

export interface ClassifiedColumn {
  title: string;
  content: string;
  topImageUrl: string;
  youtubeUrl: string;
}

export interface ClassifiedEvent {
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl: string;
}

export interface ClassifiedAlbum {
  title: string;
  images: string[];
  youtubeUrl: string;
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

export interface ClassifiedPageContent {
  pageSlug: string;
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
    churchInfo: { name: '', address: '', phone: '', email: '', description: '' },
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
