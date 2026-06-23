// 기능 상세 — 4개 페이지로 분할. 실제 TrueLight에 구현된 기능만 포함.
export const FEATURE_SLUGS = ['content', 'info', 'community', 'platform'] as const;
export type FeatureSlug = (typeof FEATURE_SLUGS)[number];

type Lang = 'ko' | 'en';
interface Item { name: string; desc: string }
interface Side { tab: string; heroTitle: string; heroSubtitle: string; items: Item[] }

export interface FeatureGroup {
  slug: FeatureSlug;
  /** Tailwind gradient classes for the hero banner. */
  accent: string;
  /** Single SVG path for the hero icon. */
  icon: string;
  ko: Side;
  en: Side;
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    slug: 'content',
    accent: 'from-blue-600 to-indigo-600',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    ko: {
      tab: '콘텐츠',
      heroTitle: '매주 올리는 콘텐츠를 손쉽게',
      heroSubtitle: '설교·주보·앨범 등 주중에 올리는 콘텐츠를 관리자에서 등록하면 홈페이지에 바로 반영됩니다.',
      items: [
        { name: '설교', desc: '유튜브 영상을 연동하고 설교자·카테고리로 분류합니다. 설교자 필터와 검색, 유튜브 썸네일 자동 표시(직접 업로드도 가능)를 지원합니다.' },
        { name: '주보', desc: '매주 주보를 PDF 또는 이미지로 등록하면 날짜별 목록으로 정리되어, 성도들이 언제든 열람할 수 있습니다.' },
        { name: '사진 앨범', desc: '교회 행사 사진을 갤러리로 모아 보여 줍니다. 카테고리로 나누고, 클릭하면 큰 화면(라이트박스)으로 확대해 봅니다.' },
        { name: '목회 칼럼', desc: '담임목사·교역자의 글을 칼럼으로 연재합니다. 성도들이 목회 메시지를 꾸준히 읽을 수 있습니다.' },
        { name: '교회 연혁', desc: '교회의 발자취를 연도별 타임라인으로 정리해 보여 줍니다.' },
        { name: '영상', desc: '예배·찬양·교육 영상을 게시판으로 모아 카테고리별로 안내합니다.' },
      ],
    },
    en: {
      tab: 'Content',
      heroTitle: 'Publish your weekly content with ease',
      heroSubtitle: 'Add sermons, bulletins, albums and more in the admin — they appear on your site right away.',
      items: [
        { name: 'Sermons', desc: 'Embed YouTube videos and organize by speaker and category. Speaker filtering, search, and automatic YouTube thumbnails (custom upload too).' },
        { name: 'Bulletins', desc: 'Add each weekly bulletin as a PDF or image; they are listed by date for members to read anytime.' },
        { name: 'Photo albums', desc: 'Collect event photos into galleries, organized by category, with a full-screen lightbox view.' },
        { name: 'Pastoral columns', desc: 'Publish writings from your pastors as an ongoing column.' },
        { name: 'Church history', desc: 'Present your church’s journey as a year-by-year timeline.' },
        { name: 'Videos', desc: 'Gather worship, praise, and teaching videos into categorized boards.' },
      ],
    },
  },
  {
    slug: 'info',
    accent: 'from-emerald-600 to-teal-600',
    icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a3 3 0 016 0v4M9 9h.01M15 9h.01',
    ko: {
      tab: '교회 안내',
      heroTitle: '교회의 얼굴이 되는 안내 페이지',
      heroSubtitle: '한 번 정해 두면 방문자에게 교회를 또렷하게 소개하는 페이지들입니다.',
      items: [
        { name: '담임목사 인사말', desc: '담임목사의 인사말과 사진으로 방문자를 맞이합니다.' },
        { name: '교회 소개', desc: '교회의 비전·신앙고백·예배 철학 등을 정리해 소개합니다.' },
        { name: '교역자 소개', desc: '담임목사와 교역자를 사진·약력·연락처와 함께 소개합니다.' },
        { name: '예배 안내', desc: '주일예배·새벽기도·구역모임 등 예배 시간표를 한눈에 안내합니다.' },
        { name: '오시는 길', desc: '교회 주소와 지도, 주차 안내를 함께 제공합니다.' },
        { name: '교육부·부서 소개', desc: '교육부, 부서·사역 페이지로 각 사역을 자세히 안내합니다.' },
      ],
    },
    en: {
      tab: 'Church Info',
      heroTitle: 'The pages that become your church’s face',
      heroSubtitle: 'Set once — these introduce your church clearly to every visitor.',
      items: [
        { name: 'Pastor’s greeting', desc: 'Welcome visitors with your pastor’s greeting and photo.' },
        { name: 'About the church', desc: 'Share your vision, confession of faith, and worship philosophy.' },
        { name: 'Staff directory', desc: 'Introduce pastors and staff with photos, bios, and contact info.' },
        { name: 'Worship info', desc: 'Show your worship schedule at a glance.' },
        { name: 'Directions', desc: 'Provide your address, a map, and parking guidance.' },
        { name: 'Ministries', desc: 'Detail education and ministry departments on dedicated pages.' },
      ],
    },
  },
  {
    slug: 'community',
    accent: 'from-violet-600 to-purple-600',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    ko: {
      tab: '소통·참여',
      heroTitle: '성도·새가족과 연결되는 통로',
      heroSubtitle: '교회 소식을 나누고, 새가족을 맞이하고, 사역으로 초대하는 기능들입니다.',
      items: [
        { name: '게시판', desc: '공지·행사·선교·자유 게시판 등 필요한 만큼 게시판을 두고 교회 소식을 나눕니다.' },
        { name: '새가족 등록', desc: '새가족 안내 페이지와 등록 폼을 제공합니다. 제출된 내용은 관리자에서 확인·관리합니다.' },
        { name: '목장 사역', desc: '목장(구역)과 목자를 소개하고, 목장 사역을 안내합니다.' },
        { name: '온라인 헌금 안내', desc: '헌금 계좌·방법을 안내하는 페이지를 제공합니다.' },
        { name: '소셜 버튼', desc: '교회 유튜브·인스타그램·카카오 등 채널로 바로 연결되는 버튼을 둡니다.' },
      ],
    },
    en: {
      tab: 'Community',
      heroTitle: 'How members and newcomers connect',
      heroSubtitle: 'Share news, welcome newcomers, and invite people into ministry.',
      items: [
        { name: 'Boards', desc: 'Notice, event, mission, and open boards — as many as you need to share news.' },
        { name: 'Newcomer registration', desc: 'A newcomer info page and registration form; submissions are managed in the admin.' },
        { name: 'Cell ministry', desc: 'Introduce cells (small groups) and their leaders.' },
        { name: 'Online giving info', desc: 'A page explaining giving accounts and methods.' },
        { name: 'Social buttons', desc: 'Quick links to your church’s YouTube, Instagram, KakaoTalk, and more.' },
      ],
    },
  },
  {
    slug: 'platform',
    accent: 'from-slate-700 to-gray-900',
    icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z',
    ko: {
      tab: '사이트 운영',
      heroTitle: '교회가 직접 운영, 기반은 전문가가',
      heroSubtitle: '시작과 기반은 전문가가 갖춰 드리고, 이후 운영은 교회가 직접 합니다.',
      items: [
        { name: '전문 디자인 셋업', desc: '처음 시작할 때 교회에 어울리는 디자인을 전문가가 구축해 드립니다. 이후 콘텐츠는 교회가 직접 관리합니다.' },
        { name: '디자인 테마', desc: '교회 분위기에 맞는 여러 디자인 테마 중에서 선택할 수 있습니다.' },
        { name: '교회 전용 주소', desc: '교회만의 인터넷 주소(예: yourchurch.com)를 보안 인증서와 함께 연결합니다.' },
        { name: '모바일 대응', desc: '휴대폰·태블릿·컴퓨터 어디서나 깔끔하게 보입니다. 추가 작업이 필요 없습니다.' },
        { name: '배너 슬라이더', desc: '메인 페이지 상단에 주요 소식을 배너 슬라이드로 강조합니다.' },
        { name: '콘텐츠 내보내기', desc: '등록한 콘텐츠를 내보내 백업할 수 있습니다.' },
        { name: '관리자 계정', desc: '여러 명이 함께 관리할 수 있도록 요금제에 따라 관리자 계정을 제공합니다.' },
      ],
    },
    en: {
      tab: 'Platform',
      heroTitle: 'Your church runs it — we build the foundation',
      heroSubtitle: 'We set up the start and the groundwork; your church operates it afterward.',
      items: [
        { name: 'Professional setup', desc: 'We build a church-fitting design at the start; your church manages content afterward.' },
        { name: 'Design themes', desc: 'Choose from several designs that fit your church’s feel.' },
        { name: 'Your own address', desc: 'Connect your own domain (e.g., yourchurch.com) with a secure certificate.' },
        { name: 'Mobile-ready', desc: 'Looks clean on phones, tablets, and computers — no extra work.' },
        { name: 'Banner slider', desc: 'Highlight key news in a banner slider on the home page.' },
        { name: 'Content export', desc: 'Export your content for backup.' },
        { name: 'Admin accounts', desc: 'Multiple admin accounts so a team can manage together (by plan).' },
      ],
    },
  },
];

export const FEATURE_CHROME: Record<Lang, { back: string; apply: string; demo: string; ctaTitle: string; ctaDesc: string; note: string; sectionLabel: string }> = {
  ko: {
    back: '← 홈으로', apply: '신청하고 시작하기', demo: '데모 체험 신청',
    ctaTitle: '우리 교회 홈페이지, 직접 둘러보세요',
    ctaDesc: '실제 관리자 화면을 데모로 체험하거나, 바로 신청해 시작할 수 있습니다.',
    note: '표시된 기능은 요금제에 따라 제공 범위가 다를 수 있습니다.',
    sectionLabel: '기능 안내',
  },
  en: {
    back: '← Home', apply: 'Apply to start', demo: 'Request a demo',
    ctaTitle: 'See your church website for yourself',
    ctaDesc: 'Try the real admin in a demo, or apply to get started right away.',
    note: 'Available features may vary by plan.',
    sectionLabel: 'Features',
  },
};
