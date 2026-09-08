// Storefront block renderer — single block architecture shared with the
// super-admin builder. The static/design blocks come from @dw-church/blocks
// (the b2bsmart block set: SectionShell + elements + design tokens, reads the
// SAME props the inspector writes → no editor↔renderer drift). dw-church's
// CONTENT MODULES (sermons/bulletins/columns/albums/staff/history/events/
// board/banners) stay as storefront-only data blocks that fetch from
// /api/v1/... and override the shared map by block_type.
import type * as React from 'react';
import { BLOCK_MAP as SHARED_BLOCK_MAP } from '@dw-church/blocks';
import { blockStyleToCss } from '@dw-church/blocks';
import type { BlockStyle } from '@dw-church/design-tokens';

// ── Content-module data blocks (fetch from REST API) ──────────────────
import { RecentSermonsBlock } from './blocks/RecentSermonsBlock';
import { SermonMagazineBlock } from './blocks/SermonMagazineBlock';
import { DevotionBlock } from './blocks/DevotionBlock';
import { RecentBulletinsBlock } from './blocks/RecentBulletinsBlock';
import { RecentColumnsBlock } from './blocks/RecentColumnsBlock';
import { AlbumGalleryBlock } from './blocks/AlbumGalleryBlock';
import { VideoBoardBlock } from './blocks/VideoBoardBlock';
import { ScheduleBoardBlock } from './blocks/ScheduleBoardBlock';
import { StaffGridBlock } from './blocks/StaffGridBlock';
import { HistoryTimelineBlock } from './blocks/HistoryTimelineBlock';
import { EventGridBlock } from './blocks/EventGridBlock';
import { FeaturedEventBlock } from './blocks/FeaturedEventBlock';
import { VerseOfDayBlock } from './blocks/VerseOfDayBlock';
import { NewsAnnouncementsBlock } from './blocks/NewsAnnouncementsBlock';
import { LayoutBlock } from './blocks/LayoutBlock';
import { BoardBlock } from './blocks/BoardBlock';
import { BannerSliderBlock } from './blocks/BannerSliderBlock';
import { CellGridBlock } from './blocks/CellGridBlock';
import { NewcomerFormBlock } from './blocks/NewcomerFormBlock';
import { CellReportBlock } from './blocks/CellReportBlock';
import { CustomFormBlock } from './blocks/CustomFormBlock';
// ── Church-specific static blocks not in the shared set ───────────────
// pastor_message / newcomer_info / worship_schedule now live in
// @dw-church/blocks (shared set) so the storefront + builder render them
// identically with full design-token support. ContactInfoBlock stays here
// because it's an async Server Component (fetches church settings).
import { ContactInfoBlock } from './blocks/ContactInfoBlock';

type PageSection = { id: string; blockType: string; props: Record<string, unknown>; sortOrder: number; isVisible: boolean };
type AnyBlock = (p: { props: Record<string, unknown>; slug: string; page?: number }) => React.ReactNode | Promise<React.ReactNode>;

// Church blocks override the shared map by block_type.
const CHURCH_BLOCKS: Record<string, AnyBlock> = {
  recent_sermons: RecentSermonsBlock as AnyBlock,
  sermon_magazine: SermonMagazineBlock as AnyBlock, // 설교 매거진(13a) — 이번 주 설교 커버+써머리+질문(관찰·심화·적용)
  devotion_reader: DevotionBlock as AnyBlock, // 말씀 묵상(14a) — 주간 목록 + 오늘 묵상(읽기 전용, 트래킹 없음)

  recent_bulletins: RecentBulletinsBlock as AnyBlock,
  recent_columns: RecentColumnsBlock as AnyBlock,
  album_gallery: AlbumGalleryBlock as AnyBlock,
  video_board: VideoBoardBlock as AnyBlock,
  schedule_board: ScheduleBoardBlock as AnyBlock,
  staff_grid: StaffGridBlock as AnyBlock,
  history_timeline: HistoryTimelineBlock as AnyBlock,
  event_grid: EventGridBlock as AnyBlock,
  // 카드뉴스(15a) — 운영자 업로드 정사각 이미지 카드. EventGridBlock 을 cardnews
  // 모드로 강제(정적 props.items 렌더). 독립 블록이라 variant 를 항상 cardnews 로.
  cardnews: ((p: { props: Record<string, unknown>; slug: string }) =>
    EventGridBlock({ props: { ...p.props, variant: 'cardnews' }, slug: p.slug })) as AnyBlock,
  featured_event: FeaturedEventBlock as AnyBlock, // 다가오는 행사 — 관리자가 고른 이벤트 1개 알림바 (미선택/종료일 경과 시 렌더 안 함)
  verse_of_day: VerseOfDayBlock as AnyBlock, // 오늘의 말씀 — 말씀 모듈의 현재 말씀 1개 (없으면 렌더 안 함)
  news_announcements: NewsAnnouncementsBlock as AnyBlock, // 주보·광고 — 주보(주보 모듈)+광고(교회소식 게시판, 카테고리 배지)+액션 버튼
  // 레이아웃 컨테이너 — 스토어프론트 렌더러로 자식을 그려서 데이터 블록(설교/주보 등)이
  // 컬럼 안에서도 실제로 렌더되게(shared 렌더러는 플레이스홀더만). 말씀|주보 2단 등에 필요.
  layout_row: LayoutBlock as AnyBlock,
  layout_columns: LayoutBlock as AnyBlock,
  layout_section: LayoutBlock as AnyBlock,
  two_columns: LayoutBlock as AnyBlock,
  three_columns: LayoutBlock as AnyBlock,
  board: BoardBlock as AnyBlock,
  banner_slider: BannerSliderBlock as AnyBlock,
  hero_image_slider: BannerSliderBlock as AnyBlock,
  cell_grid: CellGridBlock as AnyBlock, // 목장(셀) Data Block
  newcomer_form: NewcomerFormBlock as AnyBlock, // 새가족 등록 폼 (Static Block)
  cell_report: CellReportBlock as AnyBlock, // 목장사역보고서 폼 (Data Block, form_type=cell_report)
  custom_form: CustomFormBlock as AnyBlock, // 폼 빌더로 만든 커스텀 폼 (props.formSlug 로 지정)
  // contact_info is async (fetches church settings) so it stays a
  // storefront-only data block; pastor_message / newcomer_info /
  // worship_schedule come from the shared @dw-church/blocks set.
  contact_info: ContactInfoBlock as AnyBlock,
  address_info: ContactInfoBlock as AnyBlock,
};

const BLOCK_MAP: Record<string, AnyBlock> = {
  ...(SHARED_BLOCK_MAP as unknown as Record<string, AnyBlock>),
  ...CHURCH_BLOCKS,
};

interface BlockRendererProps {
  section: PageSection;
  slug: string;
  /** Current page for paginated data blocks (e.g. video_board). From ?page=. */
  page?: number;
}

export function BlockRenderer({ section, slug, page }: BlockRendererProps) {
  const Component = BLOCK_MAP[section.blockType];

  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div data-dw-section={section.id} data-dw-blocktype={section.blockType}
          className="mx-auto max-w-7xl border border-dashed border-yellow-400 bg-yellow-50 px-6 py-4 text-sm text-yellow-700">
          Unknown block type: <code>{section.blockType}</code>
        </div>
      );
    }
    return null;
  }

  // Section-level design override — the Style/Advanced tabs save a structured
  // BlockStyle to props.blockStyle. Applied at the wrapper (the block reads its
  // own in-content props like eyebrow/bgMode/overlay via SectionShell).
  //
  // Content (Data) blocks paint their OWN <section> (background + padding) via
  // DataSection, which consumes props.blockStyle directly — applying the same
  // override here too would double the padding and hide the background behind
  // the block's opaque section. So for data blocks the wrapper stays neutral
  // and DataSection is the single owner of the section chrome.
  const isDataBlock = section.blockType in CHURCH_BLOCKS;
  const overrideStyle = isDataBlock
    ? undefined
    : blockStyleToCss(section.props.blockStyle as BlockStyle | null | undefined);

  // Cast to a sync element — storefront data blocks may be async Server
  // Components; Next.js renders them fine, but tsc's JSX checker needs the cast.
  const Render = Component as (p: { props: Record<string, unknown>; slug: string; page?: number }) => React.ReactNode;

  return (
    <div data-dw-section={section.id} data-dw-blocktype={section.blockType} style={overrideStyle}>
      <Render props={section.props} slug={slug} page={page} />
    </div>
  );
}
