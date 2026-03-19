import { DWChurchClient, MockAdapter } from '@dw-church/api-client';
import type { Banner, Sermon, Bulletin, Column, Album, Event, Staff, History } from '@dw-church/api-client';
import {
  DWChurchProvider,
  BannerSlider,
  SermonList,
  BulletinList,
  ColumnGrid,
  GalleryGrid,
  EventGrid,
  StaffGrid,
  HistoryTimeline,
  LoadingSpinner,
  EmptyState,
  DateBadge,
  YoutubeEmbed,
  ImageGallery,
} from '@dw-church/ui-components';

// ─── Mock Data ──────────────────────────────────────────────

const mockBanners: Banner[] = [
  {
    id: 1,
    title: '2024 부활절 예배',
    pcImageUrl: 'https://placehold.co/1920x600/2563eb/ffffff?text=Banner+1',
    mobileImageUrl: 'https://placehold.co/768x600/2563eb/ffffff?text=Banner+1+Mobile',
    subImageUrl: '',
    linkUrl: '',
    linkTarget: '_self',
    startDate: '2024-03-01',
    endDate: '2024-12-31',
    textOverlay: {
      heading: '2024 부활절 예배',
      subheading: '함께 부활의 기쁨을 나눕시다',
      description: '4월 7일 주일 오전 11시 본당',
      position: 'center-center',
      align: 'center',
      widths: { pc: '60%', laptop: '70%', tablet: '80%', mobile: '90%' },
    },
    category: 'main',
    status: 'publish',
    createdAt: '2024-03-01T00:00:00',
    modifiedAt: '2024-03-01T00:00:00',
  },
  {
    id: 2,
    title: '성경공부 안내',
    pcImageUrl: 'https://placehold.co/1920x600/059669/ffffff?text=Banner+2',
    mobileImageUrl: 'https://placehold.co/768x600/059669/ffffff?text=Banner+2+Mobile',
    subImageUrl: '',
    linkUrl: '',
    linkTarget: '_self',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    textOverlay: {
      heading: '수요 성경공부',
      subheading: '말씀으로 세워지는 공동체',
      description: '매주 수요일 저녁 7시 30분',
      position: 'left-center',
      align: 'left',
      widths: { pc: '50%', laptop: '60%', tablet: '70%', mobile: '90%' },
    },
    category: 'main',
    status: 'publish',
    createdAt: '2024-01-01T00:00:00',
    modifiedAt: '2024-01-01T00:00:00',
  },
  {
    id: 3,
    title: '선교 헌금 안내',
    pcImageUrl: 'https://placehold.co/1920x600/d97706/ffffff?text=Banner+3',
    mobileImageUrl: 'https://placehold.co/768x600/d97706/ffffff?text=Banner+3+Mobile',
    subImageUrl: '',
    linkUrl: 'https://example.com/missions',
    linkTarget: '_blank',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    textOverlay: {
      heading: '세계 선교 헌금',
      subheading: '함께 세계를 품는 교회',
      description: '선교 후원에 동참해 주세요',
      position: 'center-bottom',
      align: 'center',
      widths: { pc: '50%', laptop: '60%', tablet: '70%', mobile: '90%' },
    },
    category: 'main',
    status: 'publish',
    createdAt: '2024-02-01T00:00:00',
    modifiedAt: '2024-02-01T00:00:00',
  },
];

const mockSermons: Sermon[] = [
  {
    id: 1,
    title: '주일설교: 믿음의 기초',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    scripture: '히브리서 11:1-6',
    preacher: '김목사',
    date: '2024-03-17',
    thumbnailUrl: 'https://placehold.co/640x360/1e3a5f/ffffff?text=Sermon+1',
    categoryIds: [1],
    category: '주일설교',
    status: 'publish',
    createdAt: '2024-03-17T00:00:00',
    modifiedAt: '2024-03-17T00:00:00',
  },
  {
    id: 2,
    title: '수요예배: 기도의 능력',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    scripture: '마태복음 6:5-15',
    preacher: '김목사',
    date: '2024-03-13',
    thumbnailUrl: 'https://placehold.co/640x360/3b1e5f/ffffff?text=Sermon+2',
    categoryIds: [2],
    category: '수요예배',
    status: 'publish',
    createdAt: '2024-03-13T00:00:00',
    modifiedAt: '2024-03-13T00:00:00',
  },
  {
    id: 3,
    title: '주일설교: 사랑의 계명',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    scripture: '요한복음 13:34-35',
    preacher: '이부목사',
    date: '2024-03-10',
    thumbnailUrl: 'https://placehold.co/640x360/5f1e3a/ffffff?text=Sermon+3',
    categoryIds: [1],
    category: '주일설교',
    status: 'publish',
    createdAt: '2024-03-10T00:00:00',
    modifiedAt: '2024-03-10T00:00:00',
  },
  {
    id: 4,
    title: '특별새벽기도: 부흥의 불길',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    scripture: '사도행전 2:1-13',
    preacher: '김목사',
    date: '2024-03-05',
    thumbnailUrl: 'https://placehold.co/640x360/1e5f3a/ffffff?text=Sermon+4',
    categoryIds: [3],
    category: '특별집회',
    status: 'publish',
    createdAt: '2024-03-05T00:00:00',
    modifiedAt: '2024-03-05T00:00:00',
  },
];

const mockBulletins: Bulletin[] = [
  {
    id: 1,
    title: '2024년 3월 17일 주보',
    date: '2024-03-17',
    pdfUrl: '',
    images: [
      'https://placehold.co/600x800/f0f0f0/333333?text=Bulletin+1+Page+1',
      'https://placehold.co/600x800/f0f0f0/333333?text=Bulletin+1+Page+2',
    ],
    thumbnailUrl: 'https://placehold.co/300x400/e2e8f0/334155?text=3%EC%9B%94+17%EC%9D%BC+%EC%A3%BC%EB%B3%B4',
    status: 'publish',
    createdAt: '2024-03-17T00:00:00',
    modifiedAt: '2024-03-17T00:00:00',
  },
  {
    id: 2,
    title: '2024년 3월 10일 주보',
    date: '2024-03-10',
    pdfUrl: '',
    images: [
      'https://placehold.co/600x800/f0f0f0/333333?text=Bulletin+2+Page+1',
    ],
    thumbnailUrl: 'https://placehold.co/300x400/e2e8f0/334155?text=3%EC%9B%94+10%EC%9D%BC+%EC%A3%BC%EB%B3%B4',
    status: 'publish',
    createdAt: '2024-03-10T00:00:00',
    modifiedAt: '2024-03-10T00:00:00',
  },
  {
    id: 3,
    title: '2024년 3월 3일 주보',
    date: '2024-03-03',
    pdfUrl: '',
    images: [
      'https://placehold.co/600x800/f0f0f0/333333?text=Bulletin+3+Page+1',
    ],
    thumbnailUrl: 'https://placehold.co/300x400/e2e8f0/334155?text=3%EC%9B%94+3%EC%9D%BC+%EC%A3%BC%EB%B3%B4',
    status: 'publish',
    createdAt: '2024-03-03T00:00:00',
    modifiedAt: '2024-03-03T00:00:00',
  },
];

const mockColumns: Column[] = [
  {
    id: 1,
    title: '봄을 기다리며',
    content: '<p>긴 겨울이 지나고 봄이 오듯, 우리의 신앙에도 새로운 계절이 찾아옵니다. 하나님의 은혜로 인내의 계절을 지나 부흥의 봄을 맞이합시다.</p>',
    topImageUrl: 'https://placehold.co/800x400/f59e0b/ffffff?text=Column+Top+Image',
    bottomImageUrl: '',
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/640x360/f59e0b/ffffff?text=Column+1',
    status: 'publish',
    createdAt: '2024-03-15T00:00:00',
    modifiedAt: '2024-03-15T00:00:00',
  },
  {
    id: 2,
    title: '공동체의 아름다움',
    content: '<p>교회는 서로 다른 은사를 가진 지체들이 하나 되어 그리스도의 몸을 이루는 아름다운 공동체입니다. 서로를 존중하고 사랑하며 함께 성장해 나갑시다.</p>',
    topImageUrl: '',
    bottomImageUrl: '',
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/640x360/8b5cf6/ffffff?text=Column+2',
    status: 'publish',
    createdAt: '2024-03-08T00:00:00',
    modifiedAt: '2024-03-08T00:00:00',
  },
  {
    id: 3,
    title: '감사의 생활',
    content: '<p>범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라. 일상 속에서 감사를 실천하는 것이 참된 예배의 시작입니다.</p>',
    topImageUrl: '',
    bottomImageUrl: '',
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/640x360/ec4899/ffffff?text=Column+3',
    status: 'publish',
    createdAt: '2024-03-01T00:00:00',
    modifiedAt: '2024-03-01T00:00:00',
  },
];

const mockAlbums: Album[] = [
  {
    id: 1,
    title: '2024 부활절 예배',
    images: [
      'https://placehold.co/800x600/2563eb/ffffff?text=Easter+1',
      'https://placehold.co/800x600/3b82f6/ffffff?text=Easter+2',
      'https://placehold.co/800x600/60a5fa/ffffff?text=Easter+3',
    ],
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/400x300/2563eb/ffffff?text=Easter+Album',
    categoryIds: [1],
    status: 'publish',
    createdAt: '2024-04-07T00:00:00',
    modifiedAt: '2024-04-07T00:00:00',
  },
  {
    id: 2,
    title: '교회 소풍',
    images: [
      'https://placehold.co/800x600/16a34a/ffffff?text=Picnic+1',
      'https://placehold.co/800x600/22c55e/ffffff?text=Picnic+2',
    ],
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/400x300/16a34a/ffffff?text=Picnic+Album',
    categoryIds: [2],
    status: 'publish',
    createdAt: '2024-05-20T00:00:00',
    modifiedAt: '2024-05-20T00:00:00',
  },
  {
    id: 3,
    title: '성가대 공연',
    images: [
      'https://placehold.co/800x600/7c3aed/ffffff?text=Choir+1',
      'https://placehold.co/800x600/8b5cf6/ffffff?text=Choir+2',
      'https://placehold.co/800x600/a78bfa/ffffff?text=Choir+3',
      'https://placehold.co/800x600/c4b5fd/ffffff?text=Choir+4',
    ],
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/400x300/7c3aed/ffffff?text=Choir+Album',
    categoryIds: [1],
    status: 'publish',
    createdAt: '2024-06-15T00:00:00',
    modifiedAt: '2024-06-15T00:00:00',
  },
  {
    id: 4,
    title: '여름 수련회',
    images: [
      'https://placehold.co/800x600/ea580c/ffffff?text=Retreat+1',
      'https://placehold.co/800x600/f97316/ffffff?text=Retreat+2',
    ],
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/400x300/ea580c/ffffff?text=Retreat+Album',
    categoryIds: [3],
    status: 'publish',
    createdAt: '2024-07-25T00:00:00',
    modifiedAt: '2024-07-25T00:00:00',
  },
];

const mockEvents: Event[] = [
  {
    id: 1,
    title: '부활절 연합예배',
    backgroundImageUrl: 'https://placehold.co/800x400/dc2626/ffffff?text=Easter+Event',
    imageOnly: false,
    department: '예배부',
    eventDate: '2024-04-07',
    location: '본당',
    linkUrl: '',
    description: '전 교인이 함께하는 부활절 연합예배입니다. 특별찬양과 세례식이 진행됩니다.',
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/400x300/dc2626/ffffff?text=Easter',
    status: 'publish',
    createdAt: '2024-03-01T00:00:00',
    modifiedAt: '2024-03-01T00:00:00',
  },
  {
    id: 2,
    title: '봄 바자회',
    backgroundImageUrl: 'https://placehold.co/800x400/65a30d/ffffff?text=Spring+Bazaar',
    imageOnly: false,
    department: '봉사부',
    eventDate: '2024-04-20',
    location: '교육관 1층',
    linkUrl: '',
    description: '사랑의 나눔 봄 바자회에 참여해 주세요. 수익금은 지역사회 봉사에 사용됩니다.',
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/400x300/65a30d/ffffff?text=Bazaar',
    status: 'publish',
    createdAt: '2024-03-10T00:00:00',
    modifiedAt: '2024-03-10T00:00:00',
  },
  {
    id: 3,
    title: '여름 수련회',
    backgroundImageUrl: 'https://placehold.co/800x400/0891b2/ffffff?text=Summer+Retreat',
    imageOnly: false,
    department: '교육부',
    eventDate: '2024-07-22',
    location: '속리산 수련원',
    linkUrl: '',
    description: '청년부 여름 수련회입니다. 2박 3일간 말씀과 교제의 시간을 갖습니다.',
    youtubeUrl: '',
    thumbnailUrl: 'https://placehold.co/400x300/0891b2/ffffff?text=Retreat',
    status: 'publish',
    createdAt: '2024-05-01T00:00:00',
    modifiedAt: '2024-05-01T00:00:00',
  },
];

const mockStaff: Staff[] = [
  {
    id: 1,
    name: '김은혜',
    role: '담임목사',
    department: '목회실',
    email: 'pastor.kim@sample-church.com',
    phone: '02-1234-5678',
    bio: '총신대학교 신학대학원 졸업. 20년간 목회 사역에 헌신하고 있습니다.',
    order: 1,
    photoUrl: 'https://placehold.co/300x400/1e40af/ffffff?text=Kim',
    snsLinks: { youtube: 'https://youtube.com' },
    isActive: true,
  },
  {
    id: 2,
    name: '이성민',
    role: '부목사',
    department: '목회실',
    email: 'pastor.lee@sample-church.com',
    phone: '02-1234-5679',
    bio: '장로회신학대학교 졸업. 청년 사역과 선교에 열정을 가지고 있습니다.',
    order: 2,
    photoUrl: 'https://placehold.co/300x400/166534/ffffff?text=Lee',
    snsLinks: {},
    isActive: true,
  },
  {
    id: 3,
    name: '박지영',
    role: '전도사',
    department: '교육부',
    email: 'evangelist.park@sample-church.com',
    phone: '02-1234-5680',
    bio: '아세아연합신학대학교 졸업. 어린이와 청소년 교육에 전문성을 갖추고 있습니다.',
    order: 3,
    photoUrl: 'https://placehold.co/300x400/7e22ce/ffffff?text=Park',
    snsLinks: { instagram: 'https://instagram.com' },
    isActive: true,
  },
  {
    id: 4,
    name: '최동현',
    role: '전도사',
    department: '청년부',
    email: 'evangelist.choi@sample-church.com',
    phone: '02-1234-5681',
    bio: '합동신학대학원 졸업. 청년 사역과 소그룹 리더십에 집중하고 있습니다.',
    order: 4,
    photoUrl: 'https://placehold.co/300x400/b45309/ffffff?text=Choi',
    snsLinks: {},
    isActive: true,
  },
  {
    id: 5,
    name: '정수진',
    role: '사무장',
    department: '행정실',
    email: 'admin.jung@sample-church.com',
    phone: '02-1234-5682',
    bio: '교회 행정과 재정 관리를 담당하고 있습니다.',
    order: 5,
    photoUrl: 'https://placehold.co/300x400/be185d/ffffff?text=Jung',
    snsLinks: {},
    isActive: true,
  },
];

const mockHistory: History[] = [
  {
    id: 1,
    year: 2024,
    items: [
      { id: '1-1', month: 3, day: 1, content: '제25대 김은혜 담임목사 취임', photoUrl: '' },
      { id: '1-2', month: 4, day: 7, content: '부활절 연합예배 및 세례식 (50명 수세)', photoUrl: '' },
      { id: '1-3', month: 6, day: 15, content: '교육관 리모델링 공사 완료', photoUrl: 'https://placehold.co/400x300/6366f1/ffffff?text=2024' },
      { id: '1-4', month: 9, day: 1, content: '해외 단기선교 파송 (필리핀)', photoUrl: '' },
    ],
  },
  {
    id: 2,
    year: 2023,
    items: [
      { id: '2-1', month: 1, day: 1, content: '신년감사예배', photoUrl: '' },
      { id: '2-2', month: 5, day: 20, content: '창립 30주년 기념예배', photoUrl: 'https://placehold.co/400x300/a855f7/ffffff?text=30th+Anniversary' },
      { id: '2-3', month: 8, day: 10, content: '여름 수련회 (속리산)', photoUrl: '' },
      { id: '2-4', month: 12, day: 25, content: '성탄절 찬양예배', photoUrl: '' },
    ],
  },
  {
    id: 3,
    year: 2022,
    items: [
      { id: '3-1', month: 3, day: 1, content: '대면 예배 전면 재개', photoUrl: '' },
      { id: '3-2', month: 6, day: 1, content: '새벽기도회 재개', photoUrl: '' },
      { id: '3-3', month: 10, day: 15, content: '추수감사절 바자회', photoUrl: 'https://placehold.co/400x300/f97316/ffffff?text=Bazaar+2022' },
    ],
  },
];

// ─── Mock Client ────────────────────────────────────────────

const mockClient = new DWChurchClient({
  baseUrl: '',
  adapter: new MockAdapter({
    '/dw-church/v1/settings': {
      name: 'Sample Church',
      address: '123 Church Street',
      phone: '02-1234-5678',
      email: 'info@sample-church.com',
      website: 'https://sample-church.com',
    },
  }),
});

// ─── App ────────────────────────────────────────────────────

export function App() {
  return (
    <DWChurchProvider client={mockClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            DW Church Component Demo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Standalone React app using @dw-church/ui-components with mock data
          </p>
        </header>

        {/* Hero: Banner Slider */}
        <section>
          <BannerSlider data={mockBanners} autoPlayInterval={4000} />
        </section>

        <main className="max-w-6xl mx-auto p-6 space-y-12">

          {/* Sermons */}
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Sermons (설교)</h2>
            <SermonList data={mockSermons} />
          </section>

          {/* Bulletins */}
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Bulletins (주보)</h2>
            <BulletinList data={mockBulletins} />
          </section>

          {/* Columns */}
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Columns (목회칼럼)</h2>
            <ColumnGrid data={mockColumns} />
          </section>

          {/* Albums */}
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Albums (갤러리)</h2>
            <GalleryGrid data={mockAlbums} />
          </section>

          {/* Events */}
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Events (행사)</h2>
            <EventGrid data={mockEvents} />
          </section>

          {/* Staff */}
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Staff (교역자)</h2>
            <StaffGrid data={mockStaff} showFilter={false} />
          </section>

          {/* History */}
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">History (교회연혁)</h2>
            <HistoryTimeline data={mockHistory} />
          </section>

          {/* Common Components Demo */}
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Common Components</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-3">LoadingSpinner</h3>
                <div className="flex gap-4 items-center">
                  <LoadingSpinner size="sm" />
                  <LoadingSpinner size="md" />
                  <LoadingSpinner size="lg" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-3">DateBadge</h3>
                <div className="flex gap-2 flex-wrap">
                  <DateBadge date="2025-03-15" format="short" />
                  <DateBadge date="2025-03-15" format="long" />
                  <DateBadge date="2025-03-15" format="year-month" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-3">YoutubeEmbed</h3>
                <YoutubeEmbed
                  url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  title="Sample Sermon Video"
                />
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-3">ImageGallery</h3>
                <ImageGallery
                  images={[
                    'https://placehold.co/400x400/6366f1/ffffff?text=1',
                    'https://placehold.co/400x400/8b5cf6/ffffff?text=2',
                    'https://placehold.co/400x400/a78bfa/ffffff?text=3',
                    'https://placehold.co/400x400/c4b5fd/ffffff?text=4',
                    'https://placehold.co/400x400/ddd6fe/333333?text=5',
                    'https://placehold.co/400x400/ede9fe/333333?text=6',
                  ]}
                  columns={3}
                  gap={4}
                />
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm col-span-full">
                <h3 className="text-sm font-medium text-gray-500 mb-3">EmptyState</h3>
                <EmptyState
                  title="아직 등록된 설교가 없습니다"
                  description="새 설교를 추가하면 이곳에 표시됩니다."
                />
              </div>
            </div>
          </section>

        </main>
      </div>
    </DWChurchProvider>
  );
}
