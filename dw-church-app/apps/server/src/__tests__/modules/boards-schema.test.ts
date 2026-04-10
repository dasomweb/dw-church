import { describe, it, expect } from 'vitest';
import { createBoardSchema, updateBoardSchema, createBoardPostSchema, updateBoardPostSchema } from '../../modules/boards/schema.js';

describe('createBoardSchema', () => {
  const valid = { title: '선교 소식', slug: 'mission' };

  it('accepts valid input', () => {
    expect(createBoardSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createBoardSchema.safeParse({
      ...valid, description: '선교 소식 게시판', sort_order: 1, is_active: true,
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createBoardSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });

  it('rejects empty slug', () => {
    expect(createBoardSchema.safeParse({ ...valid, slug: '' }).success).toBe(false);
  });

  it('defaults sort_order to 0', () => {
    const r = createBoardSchema.safeParse(valid);
    if (r.success) expect(r.data.sort_order).toBe(0);
  });

  it('defaults is_active to true', () => {
    const r = createBoardSchema.safeParse(valid);
    if (r.success) expect(r.data.is_active).toBe(true);
  });
});

describe('updateBoardSchema', () => {
  it('accepts partial', () => {
    expect(updateBoardSchema.safeParse({ title: 'Updated' }).success).toBe(true);
  });
});

describe('createBoardPostSchema', () => {
  const valid = { title: '필리핀 단기선교 보고' };

  it('accepts valid input', () => {
    expect(createBoardPostSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createBoardPostSchema.safeParse({
      ...valid,
      author_name: '홍길동',
      content: '이번 여름 선교 보고입니다.',
      attachments: [{ url: 'https://example.com/file.pdf', filename: 'report.pdf', size: 1024, type: 'application/pdf' }],
      is_pinned: true,
      status: 'draft',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createBoardPostSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('defaults author_name to empty', () => {
    const r = createBoardPostSchema.safeParse(valid);
    if (r.success) expect(r.data.author_name).toBe('');
  });

  it('defaults status to published', () => {
    const r = createBoardPostSchema.safeParse(valid);
    if (r.success) expect(r.data.status).toBe('published');
  });

  it('defaults is_pinned to false', () => {
    const r = createBoardPostSchema.safeParse(valid);
    if (r.success) expect(r.data.is_pinned).toBe(false);
  });

  it('defaults attachments to empty array', () => {
    const r = createBoardPostSchema.safeParse(valid);
    if (r.success) expect(r.data.attachments).toEqual([]);
  });
});

describe('updateBoardPostSchema', () => {
  it('accepts partial', () => {
    expect(updateBoardPostSchema.safeParse({ is_pinned: true }).success).toBe(true);
  });
});
