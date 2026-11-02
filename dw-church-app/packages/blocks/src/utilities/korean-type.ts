import type { CSSProperties } from 'react';

/**
 * 한글 역할 타입 스케일 — 블록이 폰트 크기를 숫자로 직접 박지 않고 여기서 가져간다.
 *
 * 왜 따로 두는가. 라틴 조판에서 온 시안의 11~14px 를 그대로 옮기면 한글에서
 * 읽기 어려워진다. 한글이 라틴과 다른 점:
 *
 *  1. 음절 하나가 em 박스를 거의 꽉 채운다. 라틴 소문자는 x-height 가 em 의 절반
 *     정도라 같은 px 에서 한글이 더 커 *보이지만*, 그 박스 안에 자모 2~4개(초성·
 *     중성·종성)가 들어간다. 11~12px 에서는 받침(ㄺ·ㅄ·ㅀ)의 획 간격이 1px 아래로
 *     내려가 뭉친다. 그래서 가독 하한이 라틴보다 *높다* — 보조 13px, 본문 16px.
 *  2. 어센더·디센더 여유가 없어 행이 서로 붙는다. 라틴에서 편한 1.5 가 한글에서는
 *     답답하다. 본문 1.75~1.85, 제목 1.3~1.45 가 필요하다.
 *  3. 자간 축소(음수 letter-spacing)는 큰 제목 전용 기법이다. 작은 글씨에 음수
 *     자간을 주면 음절 블록 사이 구분이 사라져 글자가 엉긴다.
 *  4. 대소문자가 없다. uppercase + 넓은 자간으로 라벨의 존재감을 만드는 라틴 기법이
 *     통하지 않으므로, 라벨의 위계는 크기와 굵기로 만든다.
 *  5. 명조(세리프)는 가로획이 얇아 작은 크기에서 산세리프보다 먼저 무너진다.
 *
 * 크기는 CSS 변수 `--ko-*` 를 거친다. 그 변수는 apps/web/app/globals.css 와
 * packages/blocks/src/styles.css 에서 `--fs-*` 래더(= 테마 토큰 --brand-*)에서
 * 파생되므로, 운영자가 테마의 폰트 크기 프리셋을 바꾸면 카드 타이포도 같이
 * 움직인다. 각 역할에 적는 폴백 px 가 한글 하한이다.
 */

export type KoreanTextRole =
  /** 카테고리·분류 라벨 (카드 위 작은 라벨) */
  | 'eyebrow'
  /** 날짜·작성자·읽기시간 등 보조 정보 */
  | 'meta'
  /** 탭·칩·더보기 링크 */
  | 'tab'
  /** 카드 발췌 2~3줄 */
  | 'summary'
  /** 본문 문단 */
  | 'body'
  /** 제목 아래 리드 문단 */
  | 'lede'
  /** 그리드 카드 제목 */
  | 'cardTitle'
  /** 사이드 레일·리스트 항목 제목 */
  | 'railTitle'
  /** 섹션 제목 (괘선 헤더) */
  | 'sectionTitle';

export interface KoreanTextSpec {
  /** CSS font-size — `--ko-*` 변수 + 한글 하한 폴백 */
  fontSize: string;
  /** 폴백이 적용될 때 렌더되는 최소 px. 하한·자간 규칙 검사가 이 값을 본다. */
  minPx: number;
  lineHeight: number;
  letterSpacing?: string;
  fontWeight?: number;
}

/** 보조 텍스트(라벨·메타)의 한글 가독 하한. 이보다 작으면 받침이 뭉친다. */
export const KOREAN_TEXT_FLOOR_PX = 13;
/** 읽는 텍스트(발췌·본문·리드)의 한글 가독 하한. */
export const KOREAN_BODY_FLOOR_PX = 16;
/** 음수 자간을 허용하는 최소 크기. 이보다 작으면 음절 구분이 사라진다. */
export const KOREAN_TIGHT_TRACKING_MIN_PX = 19;

/** 읽는 텍스트로 취급하는 역할 — 하한과 행간 요건이 더 높다. */
const READING_ROLES: readonly KoreanTextRole[] = ['summary', 'body', 'lede'];

export const KOREAN_TYPE: Record<KoreanTextRole, KoreanTextSpec> = {
  // 자간은 양수 — 한글 라벨은 자간을 조금 벌려야 또박또박 읽힌다(라틴 uppercase
  // 대체 기법). 라틴처럼 .14em 까지 벌리면 음절이 흩어져 단어로 안 묶인다.
  eyebrow: { fontSize: 'var(--ko-eyebrow, 14px)', minPx: 14, lineHeight: 1.5, letterSpacing: '0.04em', fontWeight: 600 },
  meta: { fontSize: 'var(--ko-meta, 15px)', minPx: 15, lineHeight: 1.6, fontWeight: 500 },
  tab: { fontSize: 'var(--ko-tab, 15px)', minPx: 15, lineHeight: 1.5, fontWeight: 600 },
  summary: { fontSize: 'var(--ko-summary, 16px)', minPx: 16, lineHeight: 1.75 },
  body: { fontSize: 'var(--ko-body, 17px)', minPx: 17, lineHeight: 1.85 },
  lede: { fontSize: 'var(--ko-lede, 19px)', minPx: 19, lineHeight: 1.75 },
  cardTitle: { fontSize: 'var(--ko-card-title, clamp(19px, 1.5vw, 21px))', minPx: 19, lineHeight: 1.4, letterSpacing: '-0.015em', fontWeight: 700 },
  railTitle: { fontSize: 'var(--ko-rail-title, clamp(20px, 1.7vw, 23px))', minPx: 20, lineHeight: 1.4, letterSpacing: '-0.02em', fontWeight: 700 },
  sectionTitle: { fontSize: 'var(--ko-section-title, clamp(22px, 2vw, 26px))', minPx: 22, lineHeight: 1.3, letterSpacing: '-0.02em', fontWeight: 800 },
};

/**
 * 역할 하나가 한글 조판 규칙을 지키는지 검사한다. 위반 사유를 사람이 읽을 수 있는
 * 문장으로 돌려준다(통과면 빈 배열). 역할을 새로 추가할 때 이걸 먼저 통과시킬 것 —
 * 테스트가 전 역할에 대해 호출한다.
 */
export function koreanTypeViolations(role: string, spec: KoreanTextSpec): string[] {
  const out: string[] = [];
  const reading = (READING_ROLES as readonly string[]).includes(role);
  const floor = reading ? KOREAN_BODY_FLOOR_PX : KOREAN_TEXT_FLOOR_PX;

  if (spec.minPx < floor) {
    out.push(`${role}: ${spec.minPx}px — 한글 하한 ${floor}px 미달(받침이 뭉친다)`);
  }
  if (reading && spec.lineHeight < 1.7) {
    out.push(`${role}: 행간 ${spec.lineHeight} — 읽는 텍스트는 1.7 이상(한글은 디센더 여유가 없다)`);
  }
  if (spec.lineHeight < 1.3) {
    out.push(`${role}: 행간 ${spec.lineHeight} — 한글은 1.3 미만에서 윗줄 받침과 아랫줄 초성이 닿는다`);
  }

  const em = spec.letterSpacing ? parseFloat(spec.letterSpacing) : 0;
  if (spec.letterSpacing && /em$/.test(spec.letterSpacing) && em < 0) {
    if (spec.minPx < KOREAN_TIGHT_TRACKING_MIN_PX) {
      out.push(`${role}: ${spec.minPx}px 에 음수 자간 ${spec.letterSpacing} — 자간 축소는 ${KOREAN_TIGHT_TRACKING_MIN_PX}px 이상 제목에서만`);
    }
    // 큰 제목이라도 과하게 줄이면 받침 있는 음절이 앞 글자에 붙는다.
    const limit = spec.minPx >= 24 ? -0.035 : -0.02;
    if (em < limit) {
      out.push(`${role}: 자간 ${spec.letterSpacing} — ${spec.minPx}px 에서는 ${limit}em 까지만`);
    }
  }
  // 폴백이 변수와 어긋나면 운영자가 토큰을 지웠을 때 하한이 깨진다.
  if (!spec.fontSize.startsWith('var(--ko-')) {
    out.push(`${role}: fontSize 가 --ko-* 변수를 거치지 않는다 (${spec.fontSize})`);
  }
  return out;
}

/**
 * 인라인 스타일에 펼쳐 쓰는 역할 스타일. 뒤에 오는 키로 덮어쓸 수 있다.
 *
 *   <p style={{ ...koText('meta'), color: MUTED }}>
 */
export function koText(role: KoreanTextRole, overrides?: CSSProperties): CSSProperties {
  const s = KOREAN_TYPE[role];
  return {
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    ...(s.letterSpacing ? { letterSpacing: s.letterSpacing } : {}),
    ...(s.fontWeight ? { fontWeight: s.fontWeight } : {}),
    ...overrides,
  };
}
