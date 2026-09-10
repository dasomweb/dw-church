import { z } from 'zod';

/**
 * 카드뉴스 (card news) — Claude Design 15a 기반 콘텐츠 모듈. 관리자가 정사각
 * 이미지 카드(말씀 카드·모임 안내 등)를 업로드하고, 스토어프론트 cardnews
 * 데이터 블록이 게시된 카드를 자동으로 불러와 표시. 매주 바뀌는 소식을 설교·주보처럼
 * 전용 관리 페이지에서 다룬다.
 */
export const CARDNEWS_STATUSES = ['draft', 'published', 'archived'] as const;

// 덱(deck)을 이루는 한 장의 카드 = 4:5 이미지 + 캡션(선택). Atlanta Koreatown 카드뉴스
// 레퍼런스 기준: 한 주제를 여러 장의 이미지 카드로 넘겨 본다. 최대 40장·캡션 1200자.
export const cardnewsCardSchema = z.object({
  imageUrl: z.string().max(1000),
  caption: z.string().max(1200).optional().default(''),
});

export const createCardnewsSchema = z.object({
  // 카드뉴스는 이미지 우선 — 제목은 선택(멀티 업로드 시 비어 있을 수 있음). DB 는
  // title NOT NULL 이므로 빈 문자열로 저장(널 아님).
  title: z.string().max(300).optional().default(''),       // 카드뉴스(덱) 제목(선택)
  category: z.string().max(100).optional().nullable(),     // 카테고리(말씀 카드·모임 안내 등, 자유 입력)
  description: z.string().max(2000).optional().nullable(), // 요약 설명(한 줄, 표지에 표시)
  imageUrl: z.string().max(1000).optional().nullable(),    // 표지 이미지(비우면 첫 카드로 자동)
  linkUrl: z.string().max(1000).optional().nullable(),     // 클릭 시 이동(선택 — 덱 대신 외부 링크)
  cards: z.array(cardnewsCardSchema).max(40).optional(),   // 덱을 이루는 카드들(이미지+캡션)
  sortOrder: z.number().int().optional(),
  status: z.enum(CARDNEWS_STATUSES).default('published'),
});

export const updateCardnewsSchema = createCardnewsSchema.partial();

export type CreateCardnewsInput = z.infer<typeof createCardnewsSchema>;
export type UpdateCardnewsInput = z.infer<typeof updateCardnewsSchema>;
