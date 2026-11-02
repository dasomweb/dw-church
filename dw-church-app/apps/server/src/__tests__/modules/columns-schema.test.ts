import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createColumnSchema, updateColumnSchema, COLUMN_CATEGORY_SUGGESTIONS } from '../../modules/columns/schema.js';

describe('createColumnSchema', () => {
  const valid = { title: '봄이 오는 길목에서' };

  it('accepts valid input', () => {
    expect(createColumnSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createColumnSchema.safeParse({
      ...valid,
      content: '따스한 봄바람이 불어오는 계절입니다.',
      topImageUrl: 'https://example.com/img.jpg',
      bottomImageUrl: 'https://example.com/img2.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      status: 'draft',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createColumnSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects missing title', () => {
    expect(createColumnSchema.safeParse({ content: 'no title here' }).success).toBe(false);
  });

  it('accepts lenient (non-.url) youtubeUrl string', () => {
    // youtubeUrl is a plain max-length string, not .url() validated
    expect(createColumnSchema.safeParse({ ...valid, youtubeUrl: 'not-url' }).success).toBe(true);
  });

  it('defaults status to published', () => {
    const r = createColumnSchema.safeParse(valid);
    if (r.success) expect(r.data.status).toBe('published');
  });

  it('allows null optional fields', () => {
    expect(createColumnSchema.safeParse({ ...valid, content: null, topImageUrl: null }).success).toBe(true);
  });
});

describe('updateColumnSchema', () => {
  it('accepts partial', () => {
    expect(updateColumnSchema.safeParse({ content: 'Updated' }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateColumnSchema.safeParse({}).success).toBe(true);
  });
});

/**
 * 예약 공개 — 미리 써 두고 공개 시작일을 넣으면 그 날짜부터 사이트에 나오고,
 * 종료일이 지나면 저절로 내려간다. **스케줄러는 없다** — 읽을 때 걸러낸다.
 */
describe('목회컬럼 예약 공개 입력', () => {
  it('공개 시작일·종료일을 받는다', () => {
    const r = createColumnSchema.parse({ title: 'T', publishAt: '2026-11-08', unpublishAt: '2026-11-30' });
    expect(r.publishAt).toBe('2026-11-08');
    expect(r.unpublishAt).toBe('2026-11-30');
  });

  it('일정을 안 넣으면 undefined — 서버가 NULL(제한 없음)로 넣는다', () => {
    const r = createColumnSchema.parse({ title: 'T' });
    expect(r.publishAt).toBeUndefined();
    expect(r.unpublishAt).toBeUndefined();
  });

  it('빈 문자열도 받는다 (관리 화면의 빈 날짜 칸)', () => {
    // 서버는 `|| null` 로 NULL 로 바꿔 넣는다 — ''::date 는 Postgres 22007 로 죽는다.
    const r = createColumnSchema.parse({ title: 'T', publishAt: '', unpublishAt: '' });
    expect(r.publishAt).toBe('');
    expect(r.unpublishAt).toBe('');
  });

  it('부분 수정으로 일정만 바꿀 수 있다', () => {
    const r = updateColumnSchema.parse({ publishAt: '2026-12-25' });
    expect(r.publishAt).toBe('2026-12-25');
    expect(r.title).toBeUndefined();
  });
});

/**
 * 예약 공개의 기준일은 **교회 현지 날짜(미 동부)** 다.
 * CURRENT_DATE(=UTC) 로 비교하면 미 동부 저녁 8시에 날짜가 넘어가, 주일자 칼럼이
 * 토요일 밤에 떠 버린다. 관리 화면 뱃지(publish-window.ts)와 같은 기준이어야 한다.
 */
describe('예약 공개 필터 기준일', () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), 'src/modules', rel), 'utf-8');

  for (const [label, file] of [['목회컬럼', 'columns/service.ts'], ['책 추천', 'books/service.ts']] as const) {
    it(`${label}: IN_WINDOW 가 교회 시간대로 오늘을 구한다`, () => {
      const src = read(file);
      expect(src).toContain('America/New_York');
      const inWindow = src.split('const IN_WINDOW =')[1]!.split('\n')[0]!;
      // CURRENT_DATE 로 되돌아가면 타임존 버그가 다시 생긴다.
      expect(inWindow).not.toContain('CURRENT_DATE');
      expect(inWindow).toContain('TODAY');
    });
  }

  it('목회컬럼: 상세 조회도 같은 조건으로 막는다 (주소를 알아도 안 열림)', () => {
    expect(read('columns/service.ts')).toContain("opts.activeOnly ? `AND status = 'published' AND ${IN_WINDOW}`");
  });

  it('저널: 비인증 요청에만 필터가 걸린다 (관리자는 예약분도 보여야 한다)', () => {
    const src = read('columns/routes.ts');
    // 목록 + 상세 + 카테고리 목록. 카테고리도 걸러야 공개 글 없는 탭이 안 뜬다.
    expect((src.match(/activeOnly: !request\.user/g) ?? []).length).toBe(3);
  });
});

/**
 * 저널 카테고리 — 교회이야기 / 시니어 / Biblical Parenting / 일과 영성 …
 *
 * enum 이 아니라 자유 텍스트다. 교회마다 연재 이름이 다르고, 새 연재를 시작할 때
 * 코드 배포를 기다리게 할 수 없다. 서버는 사용 중인 값을 모아 선택지로 준다.
 */
describe('저널 카테고리 입력', () => {
  it('카테고리를 받는다', () => {
    const r = createColumnSchema.parse({ title: 'T', category: '교회이야기' });
    expect(r.category).toBe('교회이야기');
  });

  it('영문 카테고리도 받는다', () => {
    expect(createColumnSchema.parse({ title: 'T', category: 'Biblical Parenting' }).category)
      .toBe('Biblical Parenting');
  });

  it('비워 두면 분류 없음 — 서버가 NULL 로 넣는다', () => {
    expect(createColumnSchema.parse({ title: 'T' }).category).toBeUndefined();
    expect(createColumnSchema.safeParse({ title: 'T', category: '' }).success).toBe(true);
    expect(createColumnSchema.safeParse({ title: 'T', category: null }).success).toBe(true);
  });

  it('80자를 넘으면 거부 — 카테고리에 본문을 붙여 넣는 사고 방지', () => {
    expect(createColumnSchema.safeParse({ title: 'T', category: 'ㄱ'.repeat(81) }).success).toBe(false);
    expect(createColumnSchema.safeParse({ title: 'T', category: 'ㄱ'.repeat(80) }).success).toBe(true);
  });

  it('부분 수정으로 카테고리만 바꿀 수 있다', () => {
    const r = updateColumnSchema.parse({ category: '시니어' });
    expect(r.category).toBe('시니어');
    expect(r.title).toBeUndefined();
  });

  it('기본 제안 목록에 요청받은 4개가 들어 있다', () => {
    expect([...COLUMN_CATEGORY_SUGGESTIONS]).toEqual(
      expect.arrayContaining(['교회이야기', '시니어', 'Biblical Parenting', '일과 영성']),
    );
  });
});

describe('저널 카테고리 조회·저장 경로', () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), 'src/modules', rel), 'utf-8');

  it('목록 필터는 대소문자·앞뒤 공백을 무시한다', () => {
    // 'Biblical Parenting' 을 ' biblical parenting ' 으로 입력해도 글이 사라지면
    // 운영자가 원인을 못 찾는다.
    const src = read('columns/service.ts');
    expect(src).toContain('LOWER(TRIM(category)) = LOWER(TRIM(');
  });

  it('빈 카테고리는 NULL 로 저장한다 (목록 필터에 빈 칸이 생기지 않게)', () => {
    const src = read('columns/service.ts');
    expect((src.match(/input\.category\?\.trim\(\) \|\| null/g) ?? []).length).toBe(2); // INSERT + UPDATE
  });

  it('카테고리 목록은 빈 문자열을 제외하고 글 많은 순으로 준다', () => {
    const src = read('columns/service.ts');
    expect(src).toContain("TRIM(category) <> ''");
    expect(src).toContain('ORDER BY COUNT(*) DESC');
  });

  it("/columns/categories 가 '/columns/:id' 보다 먼저 선언된다", () => {
    // 뒤에 두면 'categories' 가 :id 로 잡혀 404 가 된다.
    const src = read('columns/routes.ts');
    expect(src.indexOf("'/columns/categories'")).toBeGreaterThan(-1);
    expect(src.indexOf("'/columns/categories'")).toBeLessThan(src.indexOf("'/columns/:id'"));
  });

  it('목록 라우트가 category 쿼리를 서비스로 넘긴다', () => {
    const src = read('columns/routes.ts');
    expect(src).toContain('const category = (query.category as string) || undefined;');
    expect(src).toContain('search, status, category,');
  });
});
