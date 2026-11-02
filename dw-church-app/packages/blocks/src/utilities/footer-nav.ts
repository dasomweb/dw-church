/**
 * 풋터 링크 열(column) 구성 — 스토어프론트 풋터 9종이 공통으로 쓴다.
 *
 * 원래는 "하위 메뉴를 가진 상위 메뉴"만 열로 잡았다. 그런데 하위 메뉴 없이
 * 상위 메뉴만 쓰는 교회(설교노트·저널·다음세대·EM·온라인 주보·교회소개·함께하기
 * 같은 평평한 구성)는 그룹이 0개라 **풋터 링크가 통째로 사라졌다** — 운영자가
 * 풋터 메뉴 표시를 켜 둬도 아무것도 안 나온다.
 *
 * 그래서 평평한 경우에는 상위 메뉴를 두 열로 나눠 깐다. 열 제목은 없다(묶는
 * 이름이 없으니 지어내지 않는다). 하위 메뉴를 쓰는 교회의 동작은 그대로다.
 */
export interface FooterNavLink {
  id: string;
  label: string;
  href: string;
}

export interface FooterNavColumn {
  id: string;
  /** 빈 문자열이면 열 제목을 그리지 않는다. */
  label: string;
  children: FooterNavLink[];
}

export interface FooterNavSource extends FooterNavLink {
  children?: FooterNavLink[];
}

/** 상위 메뉴(+하위 메뉴) → 풋터 열. 링크가 하나도 없으면 빈 배열(풋터가 nav 를 숨긴다). */
export function footerNavColumns(items: FooterNavSource[]): FooterNavColumn[] {
  const groups = (items ?? []).filter((i) => (i.children?.length ?? 0) > 0);

  if (groups.length > 0) {
    return groups.map((g) => ({
      id: g.id,
      label: g.label,
      children: g.children ?? [],
    }));
  }

  const flat = (items ?? []).filter((i) => i.label).map((i) => ({ id: i.id, label: i.label, href: i.href }));
  if (flat.length === 0) return [];

  const half = Math.ceil(flat.length / 2);
  return [
    { id: 'nav-1', label: '', children: flat.slice(0, half) },
    { id: 'nav-2', label: '', children: flat.slice(half) },
  ].filter((c) => c.children.length > 0);
}
