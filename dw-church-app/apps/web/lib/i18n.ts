// 스토어프론트 다국어(현재 en) 렌더 유틸.
//
// lang='en' 쿠키일 때만 page_sections 의 "텍스트 프롭"을 서버 번역 API로 번역해
// 치환한다. 기본(ko) 경로는 이 코드를 전혀 타지 않으므로 라이브 무손상.
//
// 안전장치: (1) 번역 대상은 아래 TEXT_KEYS 알로리스트 키의 string 값만,
// (2) 한글이 포함된 값만(이미 영어면 스킵 → 비용·중복 방지), (3) 매핑에 없으면
// 원문 유지. URL/슬러그/이미지/variant 등은 키가 알로리스트에 없어 절대 안 건드림.

import { cookies } from 'next/headers';

/** 방문자가 고른 언어(쿠키 tl-lang). 기본 'ko'. */
export async function getRequestLang(): Promise<string> {
  try {
    const c = await cookies();
    const v = c.get('tl-lang')?.value;
    return v === 'en' ? 'en' : 'ko';
  } catch {
    return 'ko';
  }
}

export const LANG_COOKIE = 'tl-lang';

const TEXT_KEYS = new Set([
  'title', 'subtitle', 'content', 'quote', 'reference', 'eyebrow', 'description',
  'label', 'text', 'caption', 'buttonText', 'secondaryButtonText', 'buttonLabel',
  'moreLabel', 'footerLabel', 'sideTitle', 'sideDesc', 'message', 'question',
  'answer', 'name', 'role', 'heading', 'overline', 'bulletinBadge',
]);

const hasKorean = (s: string) => /[가-힣]/.test(s);

type AnyRec = Record<string, unknown>;
interface Section { id: string; blockType: string; props: AnyRec; sortOrder: number; isVisible: boolean }

function walkCollect(node: unknown, add: (s: string) => void): void {
  if (Array.isArray(node)) { for (const n of node) walkCollect(n, add); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as AnyRec)) {
      if (typeof v === 'string') {
        if (TEXT_KEYS.has(k) && v.trim() && hasKorean(v)) add(v.trim());
      } else {
        walkCollect(v, add);
      }
    }
  }
}

/** 모든 섹션 props 에서 번역 대상 문구(중복 제거)를 모은다. */
export function collectTranslatable(sections: Section[]): string[] {
  const set = new Set<string>();
  for (const s of sections) walkCollect(s.props ?? {}, (t) => set.add(t));
  return Array.from(set);
}

function mapValue(node: unknown, map: Record<string, string>): unknown {
  if (Array.isArray(node)) return node.map((n) => mapValue(n, map));
  if (node && typeof node === 'object') {
    const out: AnyRec = {};
    for (const [k, v] of Object.entries(node as AnyRec)) {
      if (typeof v === 'string' && TEXT_KEYS.has(k)) {
        const t = v.trim();
        out[k] = (t && map[t]) ? map[t] : v;
      } else {
        out[k] = mapValue(v, map);
      }
    }
    return out;
  }
  return node;
}

/** 번역 맵(원문→번역문)으로 섹션 props 를 치환한 새 배열을 반환. */
export function applyTranslations(sections: Section[], map: Record<string, string>): Section[] {
  if (!map || Object.keys(map).length === 0) return sections;
  return sections.map((s) => ({ ...s, props: mapValue(s.props ?? {}, map) as AnyRec }));
}
