/**
 * 통합 피드(latest_feed) 의 **모듈 지정 문법** — 플랫폼 공용 계약.
 *
 * 운영자는 블록 설정에 `키` 또는 `키:라벨` 을 쉼표로 적어 어떤 Content Module 을
 * 피드에 담을지 정한다. 예)
 *
 *   sermon_note:설교노트, column:저널, online_bulletin:주보, book:이달의 책
 *
 * 파싱은 스토어프론트 렌더러와 떼어 두었다 — 렌더러는 fetch 가 붙어 테스트가
 * 어렵고, 이 문법은 교회마다 손으로 쓰는 값이라 깨지면 섹션이 통째로 빈다.
 */

/** 피드에 담을 수 있는 모듈 키 → 기본 라벨. 새 모듈을 열어주려면 여기 + 로더. */
export const FEED_SOURCE_LABELS: Record<string, string> = {
  sermon_note: '설교노트',
  column: '목회칼럼',
  online_bulletin: '온라인 주보',
  sermon: '설교',
  book: '책 추천',
  event: '행사',
  album: '앨범',
  devotion: '말씀 묵상',
};

/** 아무것도 지정하지 않은 블록의 기본 구성 — 교회가 가장 흔히 쓰는 네 모듈. */
export const DEFAULT_FEED_SOURCES = 'sermon_note, column, online_bulletin, book';

export interface FeedSource {
  key: string;
  label: string;
}

/**
 * `키:라벨` 목록을 파싱한다. 적힌 순서를 지키고, 모르는 키와 중복은 버린다
 * (오타 하나로 섹션 전체가 사라지지 않도록). 라벨을 생략하면 기본 라벨.
 */
export function parseFeedSources(
  raw: string,
  known: Record<string, string> = FEED_SOURCE_LABELS,
): FeedSource[] {
  const out: FeedSource[] = [];
  for (const part of String(raw ?? '').split(',')) {
    const [keyRaw, ...rest] = part.split(':');
    const key = (keyRaw ?? '').trim();
    if (!known[key] || out.some((o) => o.key === key)) continue;
    out.push({ key, label: rest.join(':').trim() || known[key]! });
  }
  return out;
}

/**
 * 마크다운·HTML 서식을 걷어낸 평문 발췌 — 피드 카드 부제목용.
 * 사진 마크다운(![](url))은 주소가 그대로 노출되므로 통째로 지운다.
 */
export function plainExcerpt(text: unknown, max = 80): string {
  const s = String(text ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}
