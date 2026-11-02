import { describe, it, expect } from 'vitest';
import { footerNavColumns, type FooterNavSource } from '../utilities/footer-nav';

const link = (id: string, label: string) => ({ id, label, href: `/${id}` });

/**
 * 풋터에 링크가 하나도 안 나오던 버그를 막는다.
 *
 * 하위 메뉴 없이 상위 메뉴만 쓰는 교회는 "하위 메뉴를 가진 그룹"이 0개라
 * 풋터 nav 가 통째로 비어 있었다(yedam 에서 실제로 발생). 운영자 입장에선
 * 풋터 메뉴 표시를 켰는데 아무 일도 안 일어나는 것으로 보인다.
 */
describe('footerNavColumns', () => {
  it('하위 메뉴가 있으면 그룹이 그대로 열이 된다 (기존 동작)', () => {
    const items: FooterNavSource[] = [
      { ...link('about', '교회소개'), children: [link('vision', '비전'), link('staff', '교역자')] },
      { ...link('worship', '예배'), children: [link('sunday', '주일예배')] },
    ];
    const cols = footerNavColumns(items);
    expect(cols.map((c) => c.label)).toEqual(['교회소개', '예배']);
    expect(cols[0]!.children.map((c) => c.label)).toEqual(['비전', '교역자']);
  });

  it('하위 메뉴가 없는 상위 메뉴는 그룹에서 빠진다 (기존 동작)', () => {
    const items: FooterNavSource[] = [
      { ...link('about', '교회소개'), children: [link('vision', '비전')] },
      link('contact', '오시는 길'),
    ];
    expect(footerNavColumns(items).map((c) => c.label)).toEqual(['교회소개']);
  });

  it('메뉴가 평평하면 풋터가 비지 않고 두 열로 깔린다', () => {
    const items = ['설교노트', '저널', '다음세대', 'EM', '온라인 주보', '교회소개', '함께하기']
      .map((label, i) => link(`m${i}`, label));
    const cols = footerNavColumns(items);
    expect(cols).toHaveLength(2);
    expect(cols.flatMap((c) => c.children).map((c) => c.label)).toEqual(items.map((i) => i.label));
  });

  it('평평할 때는 열 제목을 지어내지 않는다 (빈 라벨)', () => {
    const cols = footerNavColumns([link('a', '설교노트'), link('b', '저널')]);
    expect(cols.every((c) => c.label === '')).toBe(true);
  });

  it('홀수는 앞 열에 하나 더 (7개 -> 4 + 3)', () => {
    const cols = footerNavColumns(Array.from({ length: 7 }, (_, i) => link(`m${i}`, `메뉴${i}`)));
    expect(cols.map((c) => c.children.length)).toEqual([4, 3]);
  });

  it('1개뿐이면 빈 열을 만들지 않는다', () => {
    const cols = footerNavColumns([link('a', '설교노트')]);
    expect(cols).toHaveLength(1);
    expect(cols[0]!.children).toHaveLength(1);
  });

  it('링크 순서와 주소를 그대로 지킨다', () => {
    const cols = footerNavColumns([link('a', '설교노트'), link('b', '저널'), link('c', '함께하기')]);
    expect(cols.flatMap((c) => c.children)).toEqual([
      { id: 'a', label: '설교노트', href: '/a' },
      { id: 'b', label: '저널', href: '/b' },
      { id: 'c', label: '함께하기', href: '/c' },
    ]);
  });

  it('메뉴가 없으면 빈 배열 — 풋터가 nav 영역을 통째로 숨긴다', () => {
    expect(footerNavColumns([])).toEqual([]);
  });

  it('라벨 없는 항목은 버린다 (빈 링크 방지)', () => {
    const cols = footerNavColumns([link('a', '설교노트'), { id: 'b', label: '', href: '/b' }]);
    expect(cols.flatMap((c) => c.children).map((c) => c.id)).toEqual(['a']);
  });
});
