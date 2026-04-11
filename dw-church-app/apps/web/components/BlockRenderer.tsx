type PageSection = { id: string; blockType: string; props: Record<string, unknown>; sortOrder: number; isVisible: boolean };
import { HeroBannerBlock } from './blocks/HeroBannerBlock';
import { BannerSliderBlock } from './blocks/BannerSliderBlock';
import { TextImageBlock } from './blocks/TextImageBlock';
import { TextOnlyBlock } from './blocks/TextOnlyBlock';
import { RecentSermonsBlock } from './blocks/RecentSermonsBlock';
import { RecentBulletinsBlock } from './blocks/RecentBulletinsBlock';
import { RecentColumnsBlock } from './blocks/RecentColumnsBlock';
import { AlbumGalleryBlock } from './blocks/AlbumGalleryBlock';
import { StaffGridBlock } from './blocks/StaffGridBlock';
import { HistoryTimelineBlock } from './blocks/HistoryTimelineBlock';
import { EventGridBlock } from './blocks/EventGridBlock';
import { WorshipScheduleBlock } from './blocks/WorshipScheduleBlock';
import { LocationMapBlock } from './blocks/LocationMapBlock';
import { ContactInfoBlock } from './blocks/ContactInfoBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { ImageGalleryBlock } from './blocks/ImageGalleryBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { NewcomerInfoBlock } from './blocks/NewcomerInfoBlock';
import { BoardBlock } from './blocks/BoardBlock';

type BlockComponent = React.FC<{ props: Record<string, unknown>; slug: string }>;

const BLOCK_MAP: Record<string, BlockComponent> = {
  // Hero (static — props from page editor)
  hero_banner: HeroBannerBlock,
  hero_full_width: HeroBannerBlock,

  // Banner slider (dynamic — data from admin 배너 관리)
  banner_slider: BannerSliderBlock,
  hero_image_slider: BannerSliderBlock,
  hero_split: TextImageBlock,        // Split hero = text + image side by side

  // About / Intro → render as TextImage or TextOnly
  pastor_message: TextImageBlock,     // Pastor photo + message
  church_intro: TextImageBlock,       // Church intro with image
  mission_vision: TextOnlyBlock,      // Mission/vision text blocks

  // Content (dynamic widgets)
  recent_sermons: RecentSermonsBlock,
  recent_bulletins: RecentBulletinsBlock,
  album_gallery: AlbumGalleryBlock,
  staff_grid: StaffGridBlock,
  history_timeline: HistoryTimelineBlock,
  event_grid: EventGridBlock,

  // Columns (목회칼럼)
  recent_columns: RecentColumnsBlock,

  // Text
  text_image: TextImageBlock,
  text_only: TextOnlyBlock,
  quote_block: TextOnlyBlock,         // Quote renders as text block

  // Church Info
  worship_schedule: WorshipScheduleBlock,
  worship_times: WorshipScheduleBlock, // Alias
  location_map: LocationMapBlock,
  map_embed: LocationMapBlock,         // Alias
  contact_info: ContactInfoBlock,
  address_info: ContactInfoBlock,      // Alias
  newcomer_info: NewcomerInfoBlock,
  visitor_welcome: NewcomerInfoBlock,  // Alias
  first_time_guide: TextOnlyBlock,     // Steps rendered as text

  // Media
  image_gallery: ImageGalleryBlock,
  video: VideoBlock,

  // CTA → render as hero-style banner
  call_to_action: HeroBannerBlock,
  newsletter_signup: TextOnlyBlock,

  // Board (게시판)
  board: BoardBlock,

  // Contact form → render as contact info block
  contact_form: ContactInfoBlock,

  // Layout
  divider: DividerBlock,
  section_header: TextOnlyBlock,       // Section header = title text
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
        <div className="mx-auto max-w-7xl border border-dashed border-yellow-400 bg-yellow-50 px-6 py-4 text-sm text-yellow-700">
          Unknown block type: <code>{section.blockType}</code>
        </div>
      );
    }
    return null;
  }

  return <Component props={section.props} slug={slug} />;
}
