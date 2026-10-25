import { describe, it, expect } from 'vitest';
import { createBookSchema, updateBookSchema } from '../../modules/books/schema.js';
import { blockTypes } from '../../modules/pages/schema.js';

/**
 * 책 추천 입력 검증.
 *
 * 이 모듈의 핵심은 서지 정보가 아니라 **추천사**라, 제목만 필수로 두고
 * 나머지는 전부 선택이다 — 교회가 "제목 + 한 줄 추천"만 적고 올릴 수 있어야 한다.
 */
describe('createBookSchema', () => {
  it('제목만 있어도 통과한다', () => {
    const r = createBookSchema.parse({ title: '복음과 하나님의 나라' });
    expect(r.title).toBe('복음과 하나님의 나라');
    expect(r.status).toBe('published'); // 기본 공개
  });

  it('제목이 비면 거부한다', () => {
    expect(() => createBookSchema.parse({ title: '' })).toThrow();
    expect(() => createBookSchema.parse({})).toThrow();
  });

  it('추천인·추천사·분야를 받는다', () => {
    const r = createBookSchema.parse({
      title: 'T', recommender: '담임목사 김○○', recommendation: '한 해를 여는 책으로 권합니다.', category: '신앙일반',
    });
    expect(r.recommender).toBe('담임목사 김○○');
    expect(r.recommendation).toContain('권합니다');
    expect(r.category).toBe('신앙일반');
  });

  it('isFeatured 는 선택이고 기본은 미지정', () => {
    expect(createBookSchema.parse({ title: 'T' }).isFeatured).toBeUndefined();
    expect(createBookSchema.parse({ title: 'T', isFeatured: true }).isFeatured).toBe(true);
  });

  it('status 는 정해진 값만 받는다', () => {
    expect(() => createBookSchema.parse({ title: 'T', status: 'nope' })).toThrow();
    expect(createBookSchema.parse({ title: 'T', status: 'draft' }).status).toBe('draft');
  });

  it('null 을 명시적으로 비우는 뜻으로 받는다 (수정 시 필드 지우기)', () => {
    const r = updateBookSchema.parse({ author: null, link: null });
    expect(r.author).toBeNull();
    expect(r.link).toBeNull();
  });

  it('부분 수정이 가능하다', () => {
    expect(updateBookSchema.parse({ recommendation: '바뀐 추천사' }).recommendation).toBe('바뀐 추천사');
    expect(() => updateBookSchema.parse({})).not.toThrow();
  });
});

describe('recent_books 블록 등록', () => {
  // 서버 enum 에 없으면 운영자가 블록을 올려도 저장이 400 난다.
  it('저장 가능한 block_type 목록에 있다', () => {
    expect(blockTypes).toContain('recent_books');
  });
});
