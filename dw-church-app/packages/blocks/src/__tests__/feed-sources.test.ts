import { describe, it, expect } from 'vitest';
import {
  FEED_SOURCE_LABELS, DEFAULT_FEED_SOURCES, parseFeedSources, plainExcerpt,
} from '../utilities/feed-sources';

/**
 * 통합 피드(latest_feed) 의 모듈 지정 문법.
 *
 * 운영자가 블록 설정에 손으로 적는 값이라, 오타 한 글자로 홈의 한 섹션이
 * 통째로 사라지면 안 된다 — 모르는 키는 **버리고 나머지는 살린다**.
 */
describe('parseFeedSources', () => {
  it('기본 구성은 교회가 흔히 쓰는 네 모듈', () => {
    const got = parseFeedSources(DEFAULT_FEED_SOURCES).map((s) => s.key);
    expect(got).toEqual(['sermon_note', 'column', 'online_bulletin', 'book']);
  });

  it('라벨을 생략하면 모듈 기본 이름', () => {
    expect(parseFeedSources('column')).toEqual([{ key: 'column', label: '저널', id: 'column' }]);
  });

  it('키:라벨 로 라벨을 바꿀 수 있다', () => {
    expect(parseFeedSources('column:목회서신')).toEqual([{ key: 'column', label: '목회서신', id: 'column' }]);
  });

  it('적은 순서를 그대로 지킨다', () => {
    const got = parseFeedSources('book, column, sermon_note').map((s) => s.key);
    expect(got).toEqual(['book', 'column', 'sermon_note']);
  });

  it('공백·빈 항목을 흘려보낸다', () => {
    const got = parseFeedSources('  column ,, \n sermon_note , ').map((s) => s.key);
    expect(got).toEqual(['column', 'sermon_note']);
  });

  it('오타 난 키만 버리고 나머지는 살린다', () => {
    const got = parseFeedSources('sermon_notes, column, 설교노트').map((s) => s.key);
    expect(got).toEqual(['column']);
  });

  it('같은 모듈을 두 번 적어도 한 번만 담는다 (카드 중복 방지)', () => {
    expect(parseFeedSources('column:저널, column:칼럼')).toEqual([{ key: 'column', label: '저널', id: 'column' }]);
  });

  it('빈 값이면 아무 것도 담지 않는다 — 호출부가 기본값으로 대체한다', () => {
    expect(parseFeedSources('')).toEqual([]);
    expect(parseFeedSources('   ')).toEqual([]);
  });

  it('로더가 있는 키만 받도록 호출부가 목록을 좁힐 수 있다', () => {
    const only = { column: '저널' };
    expect(parseFeedSources('sermon_note, column', only).map((s) => s.key)).toEqual(['column']);
  });

  it('라벨에 콜론이 들어가도 라벨 전체를 살린다', () => {
    expect(parseFeedSources('column:저널: 목회서신')[0]!.label).toBe('저널: 목회서신');
  });

  it('쓸 수 있는 키는 실제 Content Module 들이다', () => {
    expect(Object.keys(FEED_SOURCE_LABELS).sort()).toEqual(
      ['album', 'book', 'column', 'devotion', 'event', 'online_bulletin', 'sermon', 'sermon_note'],
    );
  });
});

/**
 * 카드 부제목은 본문에서 뽑는다. 마크다운 기호나 사진 주소가 그대로 새어 나오면
 * 홈에서 바로 보인다(설교노트·묵상 본문은 마크다운이다).
 */
describe('카테고리별 소스 — `키@카테고리`', () => {
  it('@카테고리 를 붙이면 그 연재만 담고, 라벨은 카테고리 이름이 된다', () => {
    expect(parseFeedSources('column@교회이야기')).toEqual([
      { key: 'column', label: '교회이야기', category: '교회이야기', id: 'column@교회이야기' },
    ]);
  });

  it('카테고리와 라벨을 따로 줄 수 있다', () => {
    expect(parseFeedSources('column@시니어:시니어 라운지')).toEqual([
      { key: 'column', label: '시니어 라운지', category: '시니어', id: 'column@시니어' },
    ]);
  });

  it('같은 모듈을 카테고리별로 여러 줄 담는다 (v6 홈 피드)', () => {
    const got = parseFeedSources('column@교회이야기, column@시니어:시니어 라운지, column@일과 영성');
    expect(got.map((x) => x.id)).toEqual(['column@교회이야기', 'column@시니어', 'column@일과 영성']);
    expect(got.map((x) => x.label)).toEqual(['교회이야기', '시니어 라운지', '일과 영성']);
  });

  it('같은 키@카테고리 중복은 버린다 — 다른 카테고리는 남긴다', () => {
    const got = parseFeedSources('column@시니어, column@시니어:중복, column@선교');
    expect(got.map((x) => x.id)).toEqual(['column@시니어', 'column@선교']);
  });

  it('카테고리 없는 줄과 있는 줄이 섞여도 따로 담긴다', () => {
    const got = parseFeedSources('column, column@교회이야기');
    expect(got.map((x) => x.id)).toEqual(['column', 'column@교회이야기']);
    expect(got[0]!.category).toBeUndefined();
  });

  it('영문 카테고리와 공백 있는 카테고리도 받는다', () => {
    const got = parseFeedSources('column@Biblical Parenting:가정과 자녀, column@일과 영성');
    expect(got[0]!.category).toBe('Biblical Parenting');
    expect(got[0]!.label).toBe('가정과 자녀');
    expect(got[1]!.category).toBe('일과 영성');
  });

  it('카테고리만 다르고 키가 오타면 버린다', () => {
    expect(parseFeedSources('columns@시니어')).toEqual([]);
  });

  it('라벨에 콜론이 있어도 카테고리를 먼저 가른다', () => {
    const got = parseFeedSources('column@시니어:라운지: 인생 후반')[0]!;
    expect(got.category).toBe('시니어');
    expect(got.label).toBe('라운지: 인생 후반');
  });
});

describe('plainExcerpt', () => {
  it('제목·인용·목록 기호를 걷어낸다', () => {
    expect(plainExcerpt('## 1. 선한 목자\n> 나는 양의 문이라\n- 첫째')).toBe('1. 선한 목자 나는 양의 문이라 첫째');
  });

  it('사진 마크다운은 주소째로 지운다', () => {
    expect(plainExcerpt('앞말 ![](https://r2.example/a.png) 뒷말')).toBe('앞말 뒷말');
  });

  it('링크는 글자만 남긴다', () => {
    expect(plainExcerpt('[주보 보기](https://example.org/b)')).toBe('주보 보기');
  });

  it('HTML 칼럼(리치텍스트)도 평문으로', () => {
    expect(plainExcerpt('<p>한 주를 <b>여는</b> 서신</p>')).toBe('한 주를 여는 서신');
  });

  it('길면 말줄임표로 자른다', () => {
    expect(plainExcerpt('가'.repeat(30), 10)).toBe(`${'가'.repeat(10)}…`);
  });

  it('짧으면 그대로 둔다 (말줄임표를 붙이지 않는다)', () => {
    expect(plainExcerpt('짧은 글', 10)).toBe('짧은 글');
  });

  it('빈 값·null 을 빈 문자열로', () => {
    expect(plainExcerpt(null)).toBe('');
    expect(plainExcerpt(undefined)).toBe('');
  });
});
