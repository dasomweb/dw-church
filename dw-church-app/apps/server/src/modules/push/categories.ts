/**
 * 푸시 알림 카테고리 — 성도가 항목별로 켜고 끄는 단위(요청서 §3-3).
 *
 * 콘텐츠는 **이미 있는 모듈에서 읽는다.** 요청서 §6 의 devotion_items 를
 * 새로 만들지 않는 이유: 매일 말씀(verses) · 말씀 묵상(devotions) ·
 * 설교 적용(sermons.application_questions) 이 이미 운영 중이라, 새 테이블을
 * 파면 같은 콘텐츠가 두 벌이 되고 교회가 두 군데에 입력하게 된다.
 *
 * `source` 는 그 카테고리가 어느 모듈에서 발송 내용을 가져오는지로, 스케줄러가 참조한다.
 * `group` 이 있으면 수신 설정 화면에서 그 이름으로 묶어 보여준다.
 */
export interface PushCategoryDef {
  key: string;
  label: string;
  description: string;
  source: string;
  /** 기본 발송 시각 HH:MM. 빈 문자열이면 정해진 시각 없이 그때그때 발송. */
  defaultTime: string;
  /** 묶음 이름(수신 설정 화면의 소제목). 없으면 단독 항목. */
  group?: string;
}

export const PUSH_CATEGORIES: PushCategoryDef[] = [
  {
    key: 'daily_verse',
    label: '매일 말씀',
    description: '오늘의 말씀 구절과 교회 묵상',
    source: 'verses',
    defaultTime: '06:30',
  },
  {
    key: 'devotion',
    label: '말씀 묵상',
    description: '그날의 묵상 본문과 질문',
    source: 'devotions',
    defaultTime: '06:30',
  },
  {
    key: 'bible_reading',
    label: '성경 통독',
    description: '선택한 통독 플랜의 오늘 분량',
    source: 'reading_plans',
    defaultTime: '21:00',
  },
  {
    key: 'sermon_application',
    label: '설교 적용',
    description: '이번 주 설교의 요일별 적용 질문',
    source: 'sermons',
    defaultTime: '12:00',
  },

  // ── 소그룹예배 ─────────────────────────────────────────────
  // 가정·직장·목장을 **각각 따로** 켜고 끈다. 한 성도가 세 곳에 다 속하는 경우는
  // 드물고(보통 가정+직장 또는 목장 하나), 안 속한 모임 알림까지 오면 금방 전체를
  // 꺼버린다. 묶음 이름만 '소그룹예배'로 같이 보여준다.
  {
    key: 'small_group_home',
    label: '가정',
    description: '가정 소그룹예배 순서와 나눔 질문',
    source: 'smallgroup',
    defaultTime: '19:00',
    group: '소그룹예배',
  },
  {
    key: 'small_group_work',
    label: '직장',
    description: '직장 소그룹예배 순서와 나눔 질문',
    source: 'smallgroup',
    defaultTime: '12:00',
    group: '소그룹예배',
  },
  {
    key: 'small_group_mokjang',
    label: '목장',
    description: '목장 소그룹예배 순서와 나눔 질문',
    source: 'smallgroup',
    defaultTime: '19:30',
    group: '소그룹예배',
  },

  {
    key: 'notice',
    label: '기도제목 · 공지',
    description: '교회가 등록한 기도제목과 공지',
    source: 'online_bulletins',
    defaultTime: '',
  },
];

/** 소그룹예배에 속하는 키들 — 교회가 운영하지 않는 모임은 관리자가 숨길 수 있게. */
export const SMALL_GROUP_CATEGORY_KEYS = PUSH_CATEGORIES
  .filter((c) => c.group === '소그룹예배')
  .map((c) => c.key);

export const PUSH_CATEGORY_KEYS = PUSH_CATEGORIES.map((c) => c.key);

export function isPushCategory(v: string): boolean {
  return PUSH_CATEGORY_KEYS.includes(v);
}

export function defaultTimeFor(key: string): string {
  return PUSH_CATEGORIES.find((c) => c.key === key)?.defaultTime ?? '';
}

/** 수신 설정 화면용 — 묶음 순서를 유지하며 그룹별로 모은다. */
export function groupedCategories(): { group: string | null; items: PushCategoryDef[] }[] {
  const out: { group: string | null; items: PushCategoryDef[] }[] = [];
  for (const c of PUSH_CATEGORIES) {
    const g = c.group ?? null;
    const last = out[out.length - 1];
    if (last && last.group === g) last.items.push(c);
    else out.push({ group: g, items: [c] });
  }
  return out;
}
