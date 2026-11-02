/**
 * 통합 피드(latest_feed) 의 **모듈 지정 문법** — 플랫폼 공용 계약.
 *
 * 운영자는 블록 설정에 `키`, `키:라벨`, `키@카테고리`, `키@카테고리:라벨` 을
 * 쉼표로 적어 어떤 Content Module 을 피드에 담을지 정한다. 예)
 *
 *   sermon_note:설교노트, column:저널, online_bulletin:주보, book:이달의 책
 *
 * `@카테고리` 를 붙이면 그 모듈을 **카테고리별로 여러 번** 담을 수 있다. 한 피드
 * 안에서 저널의 연재들을 각각 다른 줄(= 다른 탭)로 세우는 용도다. 예)
 *
 *   column@교회이야기, column@시니어:시니어 라운지, column@일과 영성
 *
 * 라벨을 생략하면 카테고리 이름이 그대로 라벨이 된다 — 카드 윗라벨에 연재 이름이
 * 뜨는 게 보통 원하는 모습이다.
 *
 * 파싱은 스토어프론트 렌더러와 떼어 두었다 — 렌더러는 fetch 가 붙어 테스트가
 * 어렵고, 이 문법은 교회마다 손으로 쓰는 값이라 깨지면 섹션이 통째로 빈다.
 */

/** 피드에 담을 수 있는 모듈 키 → 기본 라벨. 새 모듈을 열어주려면 여기 + 로더. */
export const FEED_SOURCE_LABELS: Record<string, string> = {
  sermon_note: '설교노트',
  column: '저널',
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
  /** 모듈 키 — sermon_note / column / … */
  key: string;
  /** 탭·카드 윗라벨 */
  label: string;
  /** `@` 뒤에 적은 카테고리. 그 모듈의 해당 카테고리만 담는다. */
  category?: string;
  /**
   * 이 소스 한 줄의 식별자(`key` 또는 `key@category`).
   * 피드 탭을 가르는 단위이자 중복 판정 기준 — 같은 모듈을 카테고리별로 여러 번
   * 담을 수 있어야 하므로 key 만으로는 부족하다.
   */
  id: string;
}

/**
 * `키[@카테고리][:라벨]` 목록을 파싱한다. 적힌 순서를 지키고, 모르는 키와 중복은
 * 버린다(오타 하나로 섹션 전체가 사라지지 않도록).
 *
 * 라벨 생략 시: 카테고리가 있으면 카테고리 이름, 없으면 모듈 기본 라벨.
 * 중복 판정은 `키@카테고리` 단위 — `column@시니어` 와 `column@일과 영성` 은 다른
 * 줄이고, 같은 `column@시니어` 를 두 번 적으면 뒤쪽을 버린다.
 */
export function parseFeedSources(
  raw: string,
  known: Record<string, string> = FEED_SOURCE_LABELS,
): FeedSource[] {
  const out: FeedSource[] = [];
  for (const part of String(raw ?? '').split(',')) {
    // 라벨에 ':' 가 들어갈 수 있으니 첫 ':' 에서만 자른다. '@' 는 그 앞부분에서만 본다.
    const idx = part.indexOf(':');
    const head = (idx === -1 ? part : part.slice(0, idx)).trim();
    const label = (idx === -1 ? '' : part.slice(idx + 1)).trim();
    const at = head.indexOf('@');
    const key = (at === -1 ? head : head.slice(0, at)).trim();
    const category = at === -1 ? '' : head.slice(at + 1).trim();
    if (!known[key]) continue;
    const id = category ? `${key}@${category}` : key;
    if (out.some((o) => o.id === id)) continue;
    out.push({
      key,
      label: label || category || known[key]!,
      ...(category ? { category } : {}),
      id,
    });
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
