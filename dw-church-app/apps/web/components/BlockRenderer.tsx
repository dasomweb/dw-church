import type { PageSection } from '@dw-church/api-client';
import { HeroBannerBlock } from './blocks/HeroBannerBlock';
import { TextImageBlock } from './blocks/TextImageBlock';
import { TextOnlyBlock } from './blocks/TextOnlyBlock';
import { RecentSermonsBlock } from './blocks/RecentSermonsBlock';
import { RecentBulletinsBlock } from './blocks/RecentBulletinsBlock';
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

type BlockComponent = React.FC<{ props: Record<string, unknown>; slug: string }>;

const BLOCK_MAP: Record<string, BlockComponent> = {
  hero_banner: HeroBannerBlock,
  text_image: TextImageBlock,
  text_only: TextOnlyBlock,
  recent_sermons: RecentSermonsBlock,
  recent_bulletins: RecentBulletinsBlock,
  album_gallery: AlbumGalleryBlock,
  staff_grid: StaffGridBlock,
  history_timeline: HistoryTimelineBlock,
  event_grid: EventGridBlock,
  worship_schedule: WorshipScheduleBlock,
  location_map: LocationMapBlock,
  contact_info: ContactInfoBlock,
  divider: DividerBlock,
  image_gallery: ImageGalleryBlock,
  video: VideoBlock,
  newcomer_info: NewcomerInfoBlock,
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
