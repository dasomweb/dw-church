import { describe, it, expect } from 'vitest';
import { assertSlugAllowed, RESERVED_PAGE_SLUGS } from '../../modules/pages/service.js';
import { AppError } from '../../middleware/error-handler.js';

// 예약 slug 가드 — 이 slug 로 페이지를 만들면 스토어프론트에 절대 안 나오므로
// (Worker 가 가로채거나 Next.js 물리 라우트가 우선) 생성 단계에서 막아야 한다.
describe('assertSlugAllowed (예약 페이지 slug)', () => {
  it('일반 slug 는 통과한다', () => {
    for (const slug of ['about', 'sermons', 'bulletins', 'onlinejubo', 'value-worship', 'contact']) {
      expect(() => assertSlugAllowed(slug)).not.toThrow();
    }
  });

  it('slug 가 없으면(수정 시 미지정) 통과한다', () => {
    expect(() => assertSlugAllowed(undefined)).not.toThrow();
    expect(() => assertSlugAllowed('')).not.toThrow();
  });

  it('Worker 가 가로채는 인증 경로는 막는다', () => {
    for (const slug of ['login', 'register', 'admin', 'forgot-password', 'reset-password']) {
      expect(() => assertSlugAllowed(slug)).toThrow(AppError);
    }
  });

  it('CMS 를 읽지 않는 물리 라우트(sermon-note)와 api 는 막는다', () => {
    expect(() => assertSlugAllowed('sermon-note')).toThrow(AppError);
    expect(() => assertSlugAllowed('sermon-notes')).toThrow(AppError);
    expect(() => assertSlugAllowed('api')).toThrow(AppError);
  });

  it('대소문자/공백이 달라도 막는다', () => {
    expect(() => assertSlugAllowed('  LOGIN ')).toThrow(AppError);
    expect(() => assertSlugAllowed('Admin')).toThrow(AppError);
  });

  it('400 RESERVED_SLUG 로 던진다', () => {
    try {
      assertSlugAllowed('login');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
      expect((err as AppError).code).toBe('RESERVED_SLUG');
    }
  });

  it('전용 라우트가 CMS 페이지를 읽어 렌더하는 slug 는 예약이 아니다', () => {
    for (const slug of ['sermons', 'bulletins', 'albums', 'columns', 'events', 'staff', 'history']) {
      expect(RESERVED_PAGE_SLUGS.has(slug)).toBe(false);
    }
  });
});
