// Sample gallery index for the "Church Homepage" Claude Design canvas.
// name/desc/group were CORRECTED by inspecting each card's actual layout
// (the earlier auto-generated labels had drifted one slot out of sync with the
// files, so e.g. "따뜻한 클래식" opened the photo-gallery card). If you ever
// re-run scratchpad/wrap-cards.mjs, update scratchpad/cards/_index.json to match
// THIS mapping first, or it will re-introduce the drift.
export interface CanvasSample { id: string; file: string; group: string; code: string; name: string; desc: string }
export const CANVAS_SAMPLES: CanvasSample[] = [
  { "id": "00", "file": "card-00.html", "group": "미주 한인 이민교회", "code": "01", "name": "사진 히어로형", "desc": "라운드 사진 히어로 + 예배 안내 종합 홈" },
  { "id": "01", "file": "card-01.html", "group": "미주 한인 이민교회", "code": "02", "name": "영문 우선형", "desc": "좌우 분할 히어로, 영어 헤드라인 우선" },
  { "id": "02", "file": "card-02.html", "group": "미주 한인 이민교회", "code": "03", "name": "정착 안내형", "desc": "중앙 히어로 + 정착 도움 4칸 안내" },
  { "id": "03", "file": "card-03.html", "group": "미주 한인 이민교회", "code": "04", "name": "큰 글씨형", "desc": "사진 없이 큰 글씨 공지 중심 (어르신)" },
  { "id": "04", "file": "card-04.html", "group": "미주 한인 이민교회", "code": "05", "name": "주간 일정형", "desc": "좌우 히어로 + 이번 주 일정 타임라인" },
  { "id": "05", "file": "card-05.html", "group": "소형·개척 교회", "code": "06", "name": "목사 인사말형", "desc": "사진 히어로 + 목사 인사말 소개" },
  { "id": "06", "file": "card-06.html", "group": "소형·개척 교회", "code": "07", "name": "여백 중심형", "desc": "넓은 여백·중앙 정렬 소개형" },
  { "id": "07", "file": "card-07.html", "group": "소형·개척 교회", "code": "08", "name": "지도 우선형", "desc": "좌측 지도 + 우측 오시는 길 안내" },
  { "id": "08", "file": "card-08.html", "group": "소형·개척 교회", "code": "09", "name": "모바일 홈형", "desc": "모바일 폭·하단 고정바·생중계 배너" },
  { "id": "09", "file": "card-09.html", "group": "소형·개척 교회", "code": "10", "name": "모바일 메뉴형", "desc": "모바일 메뉴 드로어 (✕ 닫기)" },
  { "id": "10", "file": "card-10.html", "group": "소형·개척 교회", "code": "11", "name": "가정교회형", "desc": "좌우 히어로 + 가정교회 모임 소개" },
  { "id": "11", "file": "card-11.html", "group": "완성도 레이아웃 시안", "code": "12", "name": "라이브 종합형", "desc": "생중계 배너 + 겹침 안내카드 종합" },
  { "id": "12", "file": "card-12.html", "group": "완성도 레이아웃 시안", "code": "13", "name": "좌측 사이드바", "desc": "좌측 고정 사이드바 + 우측 콘텐츠" },
  { "id": "13", "file": "card-13.html", "group": "완성도 레이아웃 시안", "code": "14", "name": "매거진 타일", "desc": "6열 타일에 사진·소식 혼합 배치" },
  { "id": "14", "file": "card-14.html", "group": "완성도 레이아웃 시안", "code": "15", "name": "다크 네이비", "desc": "짙은 네이비 다크 테마 홈" },
  { "id": "15", "file": "card-15.html", "group": "완성도 레이아웃 시안", "code": "16", "name": "회원 대시보드", "desc": "로그인 인사 + 바로가기 위젯 홈" },
  { "id": "16", "file": "card-16.html", "group": "완성도 레이아웃 시안", "code": "17", "name": "스토리 스크롤", "desc": "히어로 후 좌우 교차 사진·글 스크롤" },
  { "id": "17", "file": "card-17.html", "group": "완성도 레이아웃 시안", "code": "18", "name": "중앙 정렬형", "desc": "중앙 정렬 대칭 구성 심플 홈" },
  { "id": "18", "file": "card-18.html", "group": "완성도 레이아웃 시안", "code": "19", "name": "이번주 안내형", "desc": "좌우 히어로 + 이번 주 안내·갤러리" },
  { "id": "19", "file": "card-19.html", "group": "완성도 레이아웃 시안", "code": "20", "name": "사진 갤러리", "desc": "필터 칩 + 사진 타일 갤러리 중심" },
  { "id": "20", "file": "card-20.html", "group": "완성도 레이아웃 시안", "code": "21", "name": "히어로 겹침형", "desc": "히어로 위 겹치는 예배 안내 카드" },
  { "id": "21", "file": "card-21.html", "group": "완성도 레이아웃 시안", "code": "22", "name": "풀블리드 히어로", "desc": "전체화면 사진 히어로 + 큰 글씨" }
];
