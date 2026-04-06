/**
 * Block schema definitions for the page builder.
 *
 * Static blocks: content defined via props (AI/template promptable).
 * Dynamic blocks: fetch live data at render time (widget-style).
 */

export interface PropDef {
  type: string;
  description?: string;
  default?: unknown;
  options?: string[];
  items?: unknown;
}

export interface BlockSchema {
  description: string;
  props: Record<string, PropDef>;
  /** When true the block fetches live data and props are minimal config */
  dynamic?: boolean;
}

export const BLOCK_SCHEMAS: Record<string, BlockSchema> = {
  // ── Static blocks ──────────────────────────────────────────

  hero_banner: {
    description: 'Hero banner with background image, text overlay, and layout options',
    props: {
      title: { type: 'string', description: 'Main heading text' },
      subtitle: { type: 'string', description: 'Subtitle or tagline' },
      backgroundImageUrl: { type: 'string', description: 'Background image URL' },
      buttonText: { type: 'string', description: 'CTA button text' },
      buttonUrl: { type: 'string', description: 'CTA button link' },
      layout: { type: 'enum', options: ['full', 'contained'], description: 'full = full-width, contained = max-w container with rounded corners' },
      height: { type: 'enum', options: ['sm', 'md', 'lg', 'full'], description: 'Banner height' },
      textAlign: { type: 'enum', options: ['left', 'center', 'right'], description: 'Text alignment' },
    },
  },

  text_image: {
    description: 'Text and image side by side',
    props: {
      title: { type: 'string' },
      content: { type: 'string', description: 'HTML content' },
      imageUrl: { type: 'string' },
      layout: { type: 'enum', options: ['left', 'right', 'center'] },
    },
  },

  text_only: {
    description: 'Text-only content block',
    props: {
      title: { type: 'string' },
      content: { type: 'string', description: 'HTML content' },
    },
  },

  worship_schedule: {
    description: 'Worship service schedule',
    props: {
      services: {
        type: 'array',
        items: { name: 'string', time: 'string', location: 'string' },
      },
    },
  },

  location_map: {
    description: 'Map with church address',
    props: {
      address: { type: 'string' },
      lat: { type: 'number' },
      lng: { type: 'number' },
      zoom: { type: 'number', default: 15 },
    },
  },

  contact_info: {
    description: 'Church contact information (auto-fetched from settings)',
    props: {},
  },

  newcomer_info: {
    description: 'Welcome message for newcomers',
    props: {
      title: { type: 'string', default: '처음 오신 분들을 환영합니다' },
      content: { type: 'string', description: 'HTML welcome message' },
    },
  },

  image_gallery: {
    description: 'Image gallery grid',
    props: {
      title: { type: 'string' },
      images: { type: 'array', items: 'string (URL)' },
    },
  },

  video: {
    description: 'YouTube video embed',
    props: {
      title: { type: 'string' },
      youtubeUrl: { type: 'string' },
    },
  },

  divider: {
    description: 'Visual divider/spacer',
    props: {
      spacing: { type: 'enum', options: ['sm', 'md', 'lg'] },
    },
  },

  // ── Dynamic blocks (data-driven widgets) ───────────────────

  recent_sermons: {
    description: 'Recent sermons widget',
    dynamic: true,
    props: { limit: { type: 'number', default: 6 } },
  },

  recent_bulletins: {
    description: 'Recent bulletins widget',
    dynamic: true,
    props: { limit: { type: 'number', default: 4 } },
  },

  album_gallery: {
    description: 'Album gallery widget',
    dynamic: true,
    props: { limit: { type: 'number', default: 6 } },
  },

  staff_grid: {
    description: 'Staff grid widget with configurable layout',
    dynamic: true,
    props: {
      limit: { type: 'number', default: 8 },
      layout: { type: 'enum', options: ['featured', 'grid', 'list'], default: 'featured', description: 'featured=담임목사 강조, grid=전체 그리드, list=리스트' },
      photoStyle: { type: 'enum', options: ['rect', 'circle'], default: 'rect' },
      columns: { type: 'number', default: 3, description: '그리드 열 수 (2/3/4)' },
      showItems: { type: 'string', default: 'name,role,department,bio', description: '표시 항목 (콤마 구분)' },
    },
  },

  event_grid: {
    description: 'Event grid widget',
    dynamic: true,
    props: { limit: { type: 'number', default: 6 } },
  },

  history_timeline: {
    description: 'History timeline widget',
    dynamic: true,
    props: {},
  },
};
