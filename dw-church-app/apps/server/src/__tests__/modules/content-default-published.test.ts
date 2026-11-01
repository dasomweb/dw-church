import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createOnlineBulletinSchema } from '../../modules/online-bulletins/schema.js';
import { createSermonNoteSchema } from '../../modules/sermon-notes/schema.js';
import { createColumnSchema } from '../../modules/columns/schema.js';
import { createBookSchema } from '../../modules/books/schema.js';
import { createDevotionSchema } from '../../modules/devotions/schema.js';

/**
 * 콘텐츠를 작성해 올리면 **기본은 공개(published)** 다 (대표님 지시 2026-11-01).
 *
 * 교회가 글을 쓰고 저장했는데 사이트에 안 나오면, 그건 기능이 아니라 사고다.
 * (실제로 임시저장으로 작업하다 공개된 줄 착각하는 일이 있었다.)
 * 숨기고 싶을 때만 운영자가 임시저장을 고르게 한다 — 반대가 아니라.
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

/**
 * 온라인 주보 예약 공개 — **예배일에는 무조건 공개**(대표님 지시).
 *
 * 예약일은 "그 전까지만 가려 두는" 장치다. 그래서 조회 조건에
 * `service_date <= 오늘` 이 OR 로 들어가 있어야 한다. 이게 빠지면 예약일을
 * 잘못 적어 둔 주보가 정작 주일에 안 보이는 사고가 난다.
 */
describe('온라인 주보 예약 공개 — 예배일 보장', () => {
  const read = (f: string) => readFileSync(join(process.cwd(), 'src/modules/online-bulletins', f), 'utf-8');
  const svc = read('service.ts');

  it('공개 조건이 정확히 세 갈래다 (예약일 없음 / 예약일 도래 / 예배일 도래)', () => {
    expect(svc).toMatch(
      /const VISIBLE = `status = 'published' AND \(publish_at IS NULL OR publish_at <= \$\{TODAY\} OR service_date <= \$\{TODAY\}\)`/,
    );
  });

  it('기준일은 UTC 가 아니라 교회 현지 날짜', () => {
    expect(svc).toContain("America/New_York");
    expect(svc).not.toMatch(/VISIBLE[^\n]*CURRENT_DATE/);
  });

  it('목록·최신·상세가 모두 같은 조건을 쓴다', () => {
    expect((svc.match(/\$\{VISIBLE\}/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('비인증 요청에만 걸린다 (관리자는 예약분도 본다)', () => {
    const routes = read('routes.ts');
    expect(routes).toContain('activeOnly: !request.user');
    expect(routes).toContain('{ activeOnly: !request.user }');
  });

  it('예약일 빈 문자열은 NULL 로 들어간다 (22007 방지)', () => {
    expect(svc).toContain('input.publishAt || null');
  });
});
