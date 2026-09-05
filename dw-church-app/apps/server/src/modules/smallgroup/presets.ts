/**
 * 스몰그룹 운영 모델 4종 프리셋 — 엔진은 하나, 프리셋이 용어·계층·규칙만 바꾼다.
 * group_preset 한 줄이 이 기본값에서 시작하고, 교회가 SG-01 에서 개별 수정한다.
 * 프리셋은 표를 바꾸지 않는다 (기획안 §11): 모든 모델이 같은 테이블을 공유한다.
 *
 *   A 가정교회  → 목장 · 목자 · 목녀 · 목원        (분가·번식 중심)
 *   B 구역/교구 → 교구 · 구역 · 구역장 · 구역원      (지역 계층)
 *   C 셀        → 셀 · 셀리더 · 셀원                (단순 · 번식)
 *   D 사역별    → 팀 · 리더 · 회원 (중복 소속 허용)   (관심/사역 단위)
 */

export type GroupModel = 'A' | 'B' | 'C' | 'D';

/** 계층 한 단계의 정의 — 레벨명 · 리더 호칭 · 리더 필수 여부 (최대 3단). */
export interface LevelDef {
  level: number;
  name: string;        // 그 단계 조직의 이름 (예: 목장연합, 목장)
  leaderTitle: string; // 그 단계 리더 호칭 (예: 연합장, 목자)
  leaderRequired: boolean;
}

/** 용어 치환 — UI 전반에서 이 라벨로 표기한다. */
export interface Terminology {
  org: string;        // 조직 단수 (목장 / 구역 / 셀 / 모임)
  leader: string;     // 리더 (목자 / 구역장 / 셀리더 / 리더)
  subleader: string;  // 부리더 (목녀 / 부구역장 / 부셀리더 / 부리더)
  member: string;     // 구성원 (목원 / 구역원 / 셀원 / 회원)
  meeting: string;    // 모임
  report: string;     // 리포트/일지 명칭
  finder: string;     // 공개 찾기 페이지 명칭
}

export interface ReportItem {
  key: string;
  label: string;
  type: 'attendance' | 'number' | 'text' | 'textarea' | 'list';
  private?: boolean; // 교역자만 열람 (돌봄 요청 등)
}

export interface CourseSeed {
  name: string;
  stage: string;       // '1단계' 등 · 빈 문자열이면 단계 없음
  sessions: number;    // 총 회차
  criteria: number;    // 수료 기준 출석 회차
  required: 'required' | 'optional' | 'leader';
}

export interface PresetDefault {
  model: GroupModel;
  label: string;
  levelDefs: LevelDef[];
  terminology: Terminology;
  allowMulti: boolean;
  reportItems: ReportItem[];
  courseSet: CourseSeed[];
  metrics: string[]; // 대시보드 핵심 지표 키
}

// 모든 모델이 공유하는 기본 리포트 항목 (RP-01 화면 시안 기준).
function defaultReportItems(): ReportItem[] {
  return [
    { key: 'attendance', label: '참석 체크', type: 'attendance' },
    { key: 'newcomer', label: '초신자 동반', type: 'number' },
    { key: 'summary', label: '나눔 요약', type: 'textarea' },
    { key: 'prayer', label: '기도제목', type: 'list' },
    { key: 'care', label: '돌봄 요청', type: 'textarea', private: true },
  ];
}

const A_COURSES: CourseSeed[] = [
  { name: '새생명반', stage: '1단계', sessions: 8, criteria: 6, required: 'required' },
  { name: '생명의 삶', stage: '2단계', sessions: 12, criteria: 9, required: 'required' },
  { name: '경건의 삶', stage: '3단계', sessions: 8, criteria: 6, required: 'optional' },
  { name: '새로운 삶', stage: '3단계', sessions: 8, criteria: 6, required: 'optional' },
  { name: '목자·목녀 훈련', stage: '4단계', sessions: 16, criteria: 13, required: 'leader' },
];

export const PRESETS: Record<GroupModel, PresetDefault> = {
  A: {
    model: 'A',
    label: '가정교회 (목장)',
    levelDefs: [
      { level: 1, name: '목장연합', leaderTitle: '연합장', leaderRequired: false },
      { level: 2, name: '목장', leaderTitle: '목자', leaderRequired: true },
    ],
    terminology: { org: '목장', leader: '목자', subleader: '목녀', member: '목원', meeting: '모임', report: '목장 리포트', finder: '목장 찾기' },
    allowMulti: false,
    reportItems: defaultReportItems(),
    courseSet: A_COURSES,
    metrics: ['groups', 'members', 'reportRate', 'newcomers', 'placementQueue'],
  },
  B: {
    model: 'B',
    label: '구역 / 교구',
    levelDefs: [
      { level: 1, name: '교구', leaderTitle: '교구장', leaderRequired: false },
      { level: 2, name: '구역', leaderTitle: '구역장', leaderRequired: true },
    ],
    terminology: { org: '구역', leader: '구역장', subleader: '부구역장', member: '구역원', meeting: '구역 예배', report: '구역 보고', finder: '구역 찾기' },
    allowMulti: false,
    reportItems: defaultReportItems(),
    courseSet: [
      { name: '새신자반', stage: '1단계', sessions: 8, criteria: 6, required: 'required' },
      { name: '제자훈련', stage: '2단계', sessions: 12, criteria: 9, required: 'optional' },
    ],
    metrics: ['groups', 'members', 'reportRate', 'newcomers', 'placementQueue'],
  },
  C: {
    model: 'C',
    label: '셀',
    levelDefs: [
      { level: 1, name: '셀', leaderTitle: '셀리더', leaderRequired: true },
    ],
    terminology: { org: '셀', leader: '셀리더', subleader: '부셀리더', member: '셀원', meeting: '셀 모임', report: '셀 리포트', finder: '셀 찾기' },
    allowMulti: false,
    reportItems: defaultReportItems(),
    courseSet: [
      { name: '새가족반', stage: '1단계', sessions: 6, criteria: 5, required: 'required' },
      { name: '셀리더 훈련', stage: '리더', sessions: 10, criteria: 8, required: 'leader' },
    ],
    metrics: ['groups', 'members', 'reportRate', 'newcomers', 'placementQueue'],
  },
  D: {
    model: 'D',
    label: '사역별 · 관심 모임',
    levelDefs: [
      { level: 1, name: '사역', leaderTitle: '사역장', leaderRequired: false },
      { level: 2, name: '모임', leaderTitle: '리더', leaderRequired: true },
    ],
    terminology: { org: '모임', leader: '리더', subleader: '부리더', member: '회원', meeting: '모임', report: '모임 기록', finder: '모임 찾기' },
    allowMulti: true, // 한 사람이 여러 모임에 소속 가능
    reportItems: defaultReportItems(),
    courseSet: [],
    metrics: ['groups', 'members', 'reportRate', 'placementQueue'],
  },
};

/** 프리셋 기본값으로 group_preset 행에 저장할 payload 를 만든다. */
export function presetPayload(model: GroupModel) {
  const p = PRESETS[model];
  return {
    model: p.model,
    levelDefs: p.levelDefs,
    terminology: p.terminology,
    allowMulti: p.allowMulti,
    reportItems: p.reportItems,
    courseSet: p.courseSet,
    metrics: p.metrics,
  };
}

/** 저장된 프리셋 행에서 유효 용어를 뽑는다 (오버라이드 우선, 없으면 모델 기본값). */
export function resolveTerminology(model: GroupModel, override?: Partial<Terminology> | null): Terminology {
  const base = PRESETS[model]?.terminology ?? PRESETS.A.terminology;
  return { ...base, ...(override ?? {}) };
}
