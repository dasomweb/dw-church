export interface TemplateColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
}

export interface TemplateFonts {
  heading: string;
  body: string;
}

export interface TemplateSection {
  blockType: string;
  props: Record<string, unknown>;
}

export interface TemplatePage {
  title: string;
  slug: string;
  isHome?: boolean;
  sections: TemplateSection[];
}

export interface Template {
  name: string;
  label: string;
  colors: TemplateColors;
  fonts: TemplateFonts;
  defaultPages: TemplatePage[];
}

// ─── Shared page helpers ───────────────────────────────────────

const aboutSections: TemplateSection[] = [
  { blockType: 'text_image', props: { title: '교회 소개', content: '우리 교회를 소개합니다.', layout: 'right' } },
  { blockType: 'staff_grid', props: { limit: 12 } },
  { blockType: 'history_timeline', props: {} },
];

const worshipSections: TemplateSection[] = [
  { blockType: 'worship_schedule', props: { services: [
    { name: '주일 1부 예배', time: '오전 9:00', location: '본당' },
    { name: '주일 2부 예배', time: '오전 11:00', location: '본당' },
    { name: '수요 예배', time: '오후 7:30', location: '본당' },
    { name: '금요 기도회', time: '오후 9:00', location: '기도실' },
  ] } },
  { blockType: 'location_map', props: { address: '' } },
  { blockType: 'contact_info', props: {} },
];

// ─── Templates ─────────────────────────────────────────────────

export const templates: Template[] = [
  {
    name: 'modern',
    label: '모던',
    colors: { primary: '#2563eb', secondary: '#64748b', accent: '#f59e0b', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
    fonts: { heading: 'Pretendard', body: 'Pretendard' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'text_image', props: { title: '환영합니다', content: '사랑과 은혜가 넘치는 교회에 오신 것을 환영합니다.', layout: 'right' } },
          { blockType: 'recent_sermons', props: { limit: 6 } },
          { blockType: 'worship_schedule', props: { services: [{ name: '주일예배', time: '오전 11:00', location: '본당' }] } },
          { blockType: 'staff_grid', props: { limit: 4 } },
          { blockType: 'location_map', props: { address: '' } },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'classic',
    label: '클래식',
    colors: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#ec4899', background: '#faf5ff', surface: '#f5f3ff', text: '#1e1b4b' },
    fonts: { heading: 'Noto Serif KR', body: 'Noto Sans KR' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'text_only', props: { title: '환영합니다', content: '하나님의 은혜와 평강이 가득한 교회입니다.' } },
          { blockType: 'recent_sermons', props: { limit: 4 } },
          { blockType: 'recent_bulletins', props: { limit: 4 } },
          { blockType: 'event_grid', props: { limit: 3 } },
          { blockType: 'contact_info', props: {} },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'minimal',
    label: '미니멀',
    colors: { primary: '#18181b', secondary: '#71717a', accent: '#a855f7', background: '#ffffff', surface: '#fafafa', text: '#18181b' },
    fonts: { heading: 'Pretendard', body: 'Pretendard' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'recent_sermons', props: { limit: 3 } },
          { blockType: 'divider', props: {} },
          { blockType: 'worship_schedule', props: { services: [{ name: '주일예배', time: '오전 11:00', location: '본당' }] } },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'warm',
    label: '따뜻한',
    colors: { primary: '#ea580c', secondary: '#f97316', accent: '#fbbf24', background: '#fffbeb', surface: '#fef3c7', text: '#451a03' },
    fonts: { heading: 'Noto Sans KR', body: 'Noto Sans KR' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'text_image', props: { title: '따뜻한 교회', content: '가족 같은 따뜻함으로 여러분을 맞이합니다.', layout: 'left' } },
          { blockType: 'recent_sermons', props: { limit: 6 } },
          { blockType: 'album_gallery', props: { limit: 8 } },
          { blockType: 'staff_grid', props: { limit: 6 } },
          { blockType: 'newcomer_info', props: { content: '처음 오신 분들을 환영합니다.' } },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'formal',
    label: '포멀',
    colors: { primary: '#1e3a5f', secondary: '#3b82f6', accent: '#d4af37', background: '#ffffff', surface: '#f1f5f9', text: '#0f172a' },
    fonts: { heading: 'Noto Serif KR', body: 'Noto Sans KR' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'text_only', props: { title: '인사말', content: '하나님의 크신 사랑 안에서 문안드립니다.' } },
          { blockType: 'worship_schedule', props: { services: [{ name: '주일예배', time: '오전 11:00', location: '대예배실' }] } },
          { blockType: 'recent_sermons', props: { limit: 4 } },
          { blockType: 'staff_grid', props: { limit: 8 } },
          { blockType: 'location_map', props: { address: '' } },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'dark',
    label: '다크',
    colors: { primary: '#6366f1', secondary: '#818cf8', accent: '#22d3ee', background: '#0f172a', surface: '#1e293b', text: '#f1f5f9' },
    fonts: { heading: 'Pretendard', body: 'Pretendard' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'recent_sermons', props: { limit: 6 } },
          { blockType: 'event_grid', props: { limit: 4 } },
          { blockType: 'album_gallery', props: { limit: 6 } },
          { blockType: 'contact_info', props: {} },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'visual',
    label: '비주얼',
    colors: { primary: '#be185d', secondary: '#f472b6', accent: '#fbbf24', background: '#ffffff', surface: '#fdf2f8', text: '#1f2937' },
    fonts: { heading: 'Noto Sans KR', body: 'Noto Sans KR' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'album_gallery', props: { limit: 8 } },
          { blockType: 'recent_sermons', props: { limit: 4 } },
          { blockType: 'event_grid', props: { limit: 6 } },
          { blockType: 'staff_grid', props: { limit: 6 } },
          { blockType: 'location_map', props: { address: '' } },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'simple',
    label: '심플',
    colors: { primary: '#059669', secondary: '#6ee7b7', accent: '#fbbf24', background: '#ffffff', surface: '#ecfdf5', text: '#064e3b' },
    fonts: { heading: 'Pretendard', body: 'Pretendard' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'text_only', props: { title: '환영합니다', content: '소박하지만 따뜻한 교회입니다.' } },
          { blockType: 'recent_sermons', props: { limit: 3 } },
          { blockType: 'worship_schedule', props: { services: [{ name: '주일예배', time: '오전 11:00', location: '본당' }] } },
          { blockType: 'contact_info', props: {} },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'traditional',
    label: '전통',
    colors: { primary: '#7c2d12', secondary: '#a16207', accent: '#b91c1c', background: '#fefce8', surface: '#fef9c3', text: '#422006' },
    fonts: { heading: 'Noto Serif KR', body: 'Noto Serif KR' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'text_only', props: { title: '담임목사 인사말', content: '하나님의 은혜 가운데 여러분을 환영합니다.' } },
          { blockType: 'recent_sermons', props: { limit: 4 } },
          { blockType: 'recent_bulletins', props: { limit: 4 } },
          { blockType: 'worship_schedule', props: { services: [{ name: '주일 1부', time: '오전 9:00', location: '본당' }, { name: '주일 2부', time: '오전 11:00', location: '본당' }] } },
          { blockType: 'history_timeline', props: {} },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
  {
    name: 'youth',
    label: '청년',
    colors: { primary: '#8b5cf6', secondary: '#06b6d4', accent: '#f43f5e', background: '#ffffff', surface: '#f5f3ff', text: '#1e1b4b' },
    fonts: { heading: 'Pretendard', body: 'Pretendard' },
    defaultPages: [
      {
        title: '홈', slug: 'home', isHome: true,
        sections: [
          { blockType: 'hero_banner', props: {} },
          { blockType: 'video', props: { title: '최신 설교', youtubeUrl: '' } },
          { blockType: 'event_grid', props: { limit: 6 } },
          { blockType: 'album_gallery', props: { limit: 8 } },
          { blockType: 'newcomer_info', props: { content: '처음 오신 분도 편하게 오세요!' } },
          { blockType: 'contact_info', props: {} },
        ],
      },
      { title: '교회소개', slug: 'about', sections: aboutSections },
      { title: '예배안내', slug: 'worship', sections: worshipSections },
    ],
  },
];

export function getTemplate(name: string): Template | undefined {
  return templates.find((t) => t.name === name);
}
