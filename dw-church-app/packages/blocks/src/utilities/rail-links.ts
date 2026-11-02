/**
 * 사이드 레일(통합 피드 `rail-left` / `rail-right` variant)의 **입력 문법** —
 * 플랫폼 공용 계약.
 *
 * 레일은 본문 옆에 붙는 좁은 안내 칼럼이다. 세 덩어리로 되어 있고, 그 중
 * 링크 줄만 문법이 필요하다.
 *
 *   railLinks = `키[:라벨]` 쉼표 구분
 *
 * 키 자리에 올 수 있는 것:
 *   - **Content Module 키** (online_bulletin · sermon_note · book …)
 *       → 그 모듈 **최신 글**로 연결되고 오른쪽 값에 그 글의 날짜가 자동으로 뜬다.
 *         주일마다 운영자가 날짜를 손으로 고치지 않게 하는 것이 이 줄의 목적이다.
 *   - **사이트 경로**(`/worship`) 또는 **외부 주소**(`https://…`)
 *       → 적은 주소로 연결되고 오른쪽 값은 '›' 만.
 *
 * 예) `online_bulletin:온라인 주보, sermon_note:설교노트, book:이달의 책, /worship:예배 안내`
 *
 * 레일의 짧은 목록(안내 문구 · 기도제목)은 문법이랄 게 없어서 `|` 로만 나눈다 —
 * 한글 문장에 '|' 가 들어가는 일은 없고, 쉼표로 나누면 "교사, 교역자를 위해"
 * 같은 한 줄이 두 줄로 쪼개진다.
 */
import { FEED_SOURCE_LABELS } from './feed-sources';

export interface RailLink {
  /** Content Module 키 — 있으면 최신 글의 날짜·주소를 자동으로 채운다 */
  key?: string;
  /** 운영자가 직접 적은 주소(사이트 경로 또는 외부 URL) */
  href?: string;
  /** 왼쪽에 보이는 이름 */
  label: string;
  /** 중복 판정 + React key (= 적어 넣은 키/주소 그대로) */
  id: string;
}

/**
 * `키[:라벨]` 목록을 파싱한다. 적힌 순서를 지키고, 모르는 모듈 키와 중복은 버린다
 * (오타 하나로 레일이 통째로 비지 않도록).
 *
 * 라벨을 생략하면 모듈 기본 이름(주소를 적은 줄은 주소 그대로 — 운영자가 바로
 * 알아보고 고칠 수 있게).
 */
export function parseRailLinks(
  raw: unknown,
  known: Record<string, string> = FEED_SOURCE_LABELS,
): RailLink[] {
  const out: RailLink[] = [];
  for (const part of String(raw ?? '').split(',')) {
    const text = part.trim();
    if (!text) continue;
    // 'https://a.org:라벨' 의 **스킴 콜론**을 라벨 구분자로 잘못 읽지 않게, 주소
    // 형태를 먼저 통째로 집은 뒤 그 다음 콜론에서만 라벨을 자른다.
    const m = /^(https?:\/\/[^:]+|[^:]*)(?::([\s\S]*))?$/.exec(text);
    if (!m) continue;
    const head = (m[1] ?? '').trim();
    const label = (m[2] ?? '').trim();
    if (!head) continue;
    if (out.some((o) => o.id === head)) continue;

    const isUrl = head.startsWith('/') || head.startsWith('http');
    if (isUrl) {
      out.push({ href: head, label: label || head, id: head });
      continue;
    }
    // 로더 없는 모듈 키는 값을 채울 수 없다 — 날짜 없는 줄을 만들지 말고 버린다.
    if (!known[head]) continue;
    out.push({ key: head, label: label || known[head]!, id: head });
  }
  return out;
}

/** 레일의 짧은 목록(`가 | 나 | 다`)을 줄 배열로. 빈 칸은 버린다. */
export function splitRailLines(raw: unknown): string[] {
  return String(raw ?? '')
    .split(/[|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
