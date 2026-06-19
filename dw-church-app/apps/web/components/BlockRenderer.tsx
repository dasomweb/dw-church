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
import { RecentBulletinsBlock } from './blocks/RecentBulletinsBlock';
import { RecentColumnsBlock } from './blocks/RecentColumnsBlock';
import { AlbumGalleryBlock } from './blocks/AlbumGalleryBlock';
import { VideoBoardBlock } from './blocks/VideoBoardBlock';
import { ScheduleBoardBlock } from './blocks/ScheduleBoardBlock';
import { StaffGridBlock } from './blocks/StaffGridBlock';
import { HistoryTimelineBlock } from './blocks/HistoryTimelineBlock';
import { EventGridBlock } from './blocks/EventGridBlock';
import { BoardBlock } from './blocks/BoardBlock';
import { BannerSliderBlock } from './blocks/BannerSliderBlock';
import { CellGridBlock } from './blocks/CellGridBlock';
import { NewcomerFormBlock } from './blocks/NewcomerFormBlock';
import { CellReportBlock } from './blocks/CellReportBlock';
// ── Church-specific static blocks not in the shared set ───────────────
// pastor_message / newcomer_info / worship_schedule now live in
// @dw-church/blocks (shared set) so the storefront + builder render them
// identically with full design-token support. ContactInfoBlock stays here
// because it's an async Server Component (fetches church settings).
import { ContactInfoBlock } from './blocks/ContactInfoBlock';

type PageSection = { id: string; blockType: string; props: Record<string, unknown>; sortOrder: number; isVisible: boolean };
type AnyBlock = (p: { props: Record<string, unknown>; slug: string }) => React.ReactNode | Promise<React.ReactNode>;

// Church blocks override the shared map by block_type.
const CHURCH_BLOCKS: Record<string, AnyBlock> = {
  recent_sermons: RecentSermonsBlock as AnyBlock,
  recent_bulletins: RecentBulletinsBlock as AnyBlock,
  recent_columns: RecentColumnsBlock as AnyBlock,
  album_gallery: AlbumGalleryBlock as AnyBlock,
  video_board: VideoBoardBlock as AnyBlock,
  schedule_board: ScheduleBoardBlock as AnyBlock,
  staff_grid: StaffGridBlock as AnyBlock,
  history_timeline: HistoryTimelineBlock as AnyBlock,
  event_grid: EventGridBlock as AnyBlock,
  board: BoardBlock as AnyBlock,
  banner_slider: BannerSliderBlock as AnyBlock,
  hero_image_slider: BannerSliderBlock as AnyBlock,
  cell_grid: CellGridBlock as AnyBlock, // 목장(셀) Data Block
  newcomer_form: NewcomerFormBlock as AnyBlock, // 새가족 등록 폼 (Static Block)
  cell_report: CellReportBlock as AnyBlock, // 목장사역보고서 폼 (Data Block, form_type=cell_report)
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
}

export function BlockRenderer({ section, slug }: BlockRendererProps) {
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
  const Render = Component as (p: { props: Record<string, unknown>; slug: string }) => React.ReactNode;

  return (
    <div data-dw-section={section.id} data-dw-blocktype={section.blockType} style={overrideStyle}>
      <Render props={section.props} slug={slug} />
    </div>
  );
}
