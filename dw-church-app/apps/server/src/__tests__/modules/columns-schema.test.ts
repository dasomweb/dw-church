import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createColumnSchema, updateColumnSchema } from '../../modules/columns/schema.js';

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

  it('목회컬럼: 비인증 요청에만 필터가 걸린다 (관리자는 예약분도 보여야 한다)', () => {
    const src = read('columns/routes.ts');
    expect((src.match(/activeOnly: !request\.user/g) ?? []).length).toBe(2); // 목록 + 상세
  });
});
