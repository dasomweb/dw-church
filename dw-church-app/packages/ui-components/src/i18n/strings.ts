export const strings = {
  // Common
  loading: '로딩 중...',
  error: '오류가 발생했습니다',
  retry: '다시 시도',
  noData: '데이터가 없습니다',

  // Sermon
  sermons: '설교',
  sermon: '설교',
  noSermons: '설교 영상이 없습니다',
  allSermons: '전체 설교 보기',

  // Bulletin
  bulletins: '주보',
  noBulletins: '주보가 없습니다',
  allBulletins: '전체 주보 보기',

  // Album
  albums: '앨범',
  noAlbums: '앨범이 없습니다',
  allAlbums: '전체 앨범 보기',

  // Event
  events: '행사/이벤트',
  noEvents: '행사가 없습니다',
  allEvents: '전체 행사 보기',

  // Staff
  staff: '교역자',
  noStaff: '교역자가 없습니다',
  allStaff: '전체 교역자 보기',

  // History
  history: '교회 연혁',
  noHistory: '연혁이 없습니다',
  allHistory: '전체 연혁 보기',

  // Banner
  banners: '배너',
  noBanners: '배너가 없습니다',
  prevBanner: '이전 배너',
  nextBanner: '다음 배너',

  // Navigation
  home: '홈',
  welcome: '환영합니다',
  welcomeSubtitle: '사랑과 은혜가 넘치는 교회',
  poweredBy: 'Powered by DW Church',
  skipToContent: '본문으로 건너뛰기',
  mainMenu: '주 메뉴',
  openMenu: '메뉴 열기',
  closeMenu: '메뉴 닫기',

  // Pagination
  pagination: '페이지 탐색',
  firstPage: '첫 페이지',
  prevPage: '이전 페이지',
  nextPage: '다음 페이지',
  lastPage: '마지막 페이지',

  // Auth
  login: '로그인',
  logout: '로그아웃',
  register: '회원가입',

  // Form
  required: '필수',
  save: '저장',
  cancel: '취소',
  delete: '삭제',
  edit: '수정',
  create: '만들기',
  search: '검색',
  filter: '필터',
} as const;

export type StringKey = keyof typeof strings;
