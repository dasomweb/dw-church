import { describe, it, expect } from 'vitest';
import { parseRailLinks, splitRailLines } from '../utilities/rail-links';

/**
 * 사이드 레일의 링크 줄 — 운영자가 손으로 적는 값이라, 한 글자 오타로 레일이
 * 통째로 비면 안 된다. 모르는 모듈 키만 버리고 나머지는 살린다.
 */
describe('parseRailLinks', () => {
  it('모듈 키는 최신 글을 자동으로 물린다 (키만 남기고 주소는 비운다)', () => {
    expect(parseRailLinks('online_bulletin')).toEqual([
      { key: 'online_bulletin', label: '온라인 주보', id: 'online_bulletin' },
    ]);
  });

  it('키:라벨 로 이름을 바꿀 수 있다', () => {
    expect(parseRailLinks('book:이달의 책')).toEqual([
      { key: 'book', label: '이달의 책', id: 'book' },
    ]);
  });

  it('사이트 경로는 적은 주소로 연결한다', () => {
    expect(parseRailLinks('/worship:예배 안내')).toEqual([
      { href: '/worship', label: '예배 안내', id: '/worship' },
    ]);
  });

  it('외부 주소의 스킴 콜론을 라벨 구분자로 읽지 않는다', () => {
    expect(parseRailLinks('https://maps.example.org/a:오시는 길')).toEqual([
      { href: 'https://maps.example.org/a', label: '오시는 길', id: 'https://maps.example.org/a' },
    ]);
  });

  it('라벨 없는 주소 줄은 주소를 그대로 보여준다 — 운영자가 바로 알아보게', () => {
    expect(parseRailLinks('/worship')[0]).toEqual({ href: '/worship', label: '/worship', id: '/worship' });
  });

  it('v6 시안 레일 네 줄을 적은 순서대로 담는다', () => {
    const got = parseRailLinks('online_bulletin:온라인 주보, sermon_note:설교노트, book:이달의 책, /worship:예배 안내');
    expect(got.map((r) => r.id)).toEqual(['online_bulletin', 'sermon_note', 'book', '/worship']);
    expect(got.map((r) => r.label)).toEqual(['온라인 주보', '설교노트', '이달의 책', '예배 안내']);
  });

  it('오타 난 모듈 키만 버리고 나머지는 살린다', () => {
    expect(parseRailLinks('online_bulletins, book, 주보').map((r) => r.id)).toEqual(['book']);
  });

  it('같은 줄을 두 번 적어도 한 번만 담는다', () => {
    expect(parseRailLinks('book:이달의 책, book:책').map((r) => r.label)).toEqual(['이달의 책']);
  });

  it('공백·빈 항목을 흘려보낸다', () => {
    expect(parseRailLinks('  book ,, \n /worship , ').map((r) => r.id)).toEqual(['book', '/worship']);
  });

  it('빈 값이면 링크 덩어리를 만들지 않는다', () => {
    expect(parseRailLinks('')).toEqual([]);
    expect(parseRailLinks(null)).toEqual([]);
  });

  it('로더가 있는 키만 받도록 호출부가 목록을 좁힐 수 있다', () => {
    const only = { book: '책 추천' };
    expect(parseRailLinks('online_bulletin, book', only).map((r) => r.id)).toEqual(['book']);
  });
});

/**
 * 레일의 짧은 목록은 '|' 로만 나눈다 — 쉼표로 나누면 "교사, 교역자를 위해" 같은
 * 한 줄이 두 줄로 쪼개진다.
 */
describe('splitRailLines', () => {
  it('| 로 나눈다', () => {
    expect(splitRailLines('11월 첫째 주 | 주일예배 오전 11시')).toEqual(['11월 첫째 주', '주일예배 오전 11시']);
  });

  it('쉼표는 문장 안의 쉼표로 그대로 둔다', () => {
    expect(splitRailLines('교사, 교역자를 위해')).toEqual(['교사, 교역자를 위해']);
  });

  it('줄바꿈도 구분자로 받는다 (붙여넣기 대비)', () => {
    expect(splitRailLines('첫째 주\n오전 11시')).toEqual(['첫째 주', '오전 11시']);
  });

  it('빈 칸·빈 값을 버린다', () => {
    expect(splitRailLines(' 가 || 나 | ')).toEqual(['가', '나']);
    expect(splitRailLines('')).toEqual([]);
    expect(splitRailLines(undefined)).toEqual([]);
  });
});
