import { z } from 'zod';

/**
 * 카드뉴스 (card news) — Claude Design 15a 기반 콘텐츠 모듈. 관리자가 정사각
 * 이미지 카드(말씀 카드·모임 안내 등)를 업로드하고, 스토어프론트 cardnews
 * 데이터 블록이 게시된 카드를 자동으로 불러와 표시. 매주 바뀌는 소식을 설교·주보처럼
 * 전용 관리 페이지에서 다룬다.
 */
export const CARDNEWS_STATUSES = ['draft', 'published', 'archived'] as const;

export const createCardnewsSchema = z.object({
  // 카드뉴스는 이미지 우선 — 제목은 선택(멀티 업로드 시 비어 있을 수 있음). DB 는
  // title NOT NULL 이므로 빈 문자열로 저장(널 아님).
  title: z.string().max(300).optional().default(''),       // 카드 제목(선택)
  description: z.string().max(2000).optional().nullable(), // 카드 설명(한 줄)
  imageUrl: z.string().max(1000).optional().nullable(),    // 정사각 카드 이미지
  linkUrl: z.string().max(1000).optional().nullable(),     // 클릭 시 이동(선택)
  sortOrder: z.number().int().optional(),
  status: z.enum(CARDNEWS_STATUSES).default('published'),
});

export const updateCardnewsSchema = createCardnewsSchema.partial();

export type CreateCardnewsInput = z.infer<typeof createCardnewsSchema>;
export type UpdateCardnewsInput = z.infer<typeof updateCardnewsSchema>;
