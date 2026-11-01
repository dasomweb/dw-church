import { describe, it, expect } from 'vitest';
import { createOnlineBulletinSchema } from '../../modules/online-bulletins/schema.js';
import { createSermonNoteSchema } from '../../modules/sermon-notes/schema.js';
import { createColumnSchema } from '../../modules/columns/schema.js';
import { createBookSchema } from '../../modules/books/schema.js';
import { createDevotionSchema } from '../../modules/devotions/schema.js';

/**
 * 콘텐츠를 작성해 올리면 **기본은 공개(published)** 다 (대표님 지시 2026-11-01).
 *
 * 교회가 글을 쓰고 저장했는데 사이트에 안 나오면, 그건 기능이 아니라 사고다.
 * 숨기고 싶을 때만 운영자가 임시저장을 고르게 한다 — 반대가 아니라.
 * (온라인 주보만 draft 기본값이었고 나머지 모듈은 원래 published 였다.)
 */
describe('콘텐츠 기본 상태 = 공개', () => {
  const cases: [string, { parse: (v: unknown) => { status?: string } }, Record<string, unknown>][] = [
    ['온라인 주보', createOnlineBulletinSchema, { title: '11월 1일 주보', serviceDate: '2026-11-01' }],
    ['설교노트', createSermonNoteSchema, { noteDate: '2026-11-01' }],
    ['목회컬럼', createColumnSchema, { title: '한 주를 여는 목회서신' }],
    ['책 추천', createBookSchema, { title: '복음과 하나님의 나라' }],
    ['말씀 묵상', createDevotionSchema, { title: '복 있는 사람의 길' }],
  ];

  for (const [label, schema, input] of cases) {
    it(`${label}: 상태를 안 보내면 published`, () => {
      expect(schema.parse(input).status).toBe('published');
    });
  }

  it('임시저장은 운영자가 고를 때만 적용된다', () => {
    expect(createOnlineBulletinSchema.parse({ title: 'T', serviceDate: '2026-11-01', status: 'draft' }).status).toBe('draft');
  });
});
