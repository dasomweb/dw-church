import { z } from 'zod';

/**
 * 책 추천 (book recommendation) 콘텐츠 모듈.
 *
 * 교회가 성도에게 권하는 책 목록. 표지·저자·출판사 같은 서지 정보와 함께
 * **추천 이유**(누가, 왜 권하는가)를 담는 게 핵심 — 서점 목록이 아니라
 * 목회적 추천이라 추천인과 추천사가 서지 정보보다 중요하다.
 *
 * 구매 링크는 교회가 직접 넣는다(제휴·수익 목적 아님). 비워두면 표시하지 않는다.
 */
export const BOOK_STATUSES = ['draft', 'published', 'archived'] as const;

export const createBookSchema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(200).optional().nullable(),
  publisher: z.string().max(200).optional().nullable(),
  /** 표지 이미지 (R2). 없으면 블록이 제목 이니셜 플레이스홀더를 그린다. */
  coverImageUrl: z.string().max(1000).optional().nullable(),
  /** 분야 — 자유 입력(신앙일반·묵상·제자훈련·가정 등). 교회마다 분류가 달라 enum 으로 묶지 않는다. */
  category: z.string().max(80).optional().nullable(),
  /** 추천인 — 담임목사·교역자·장로 등. */
  recommender: z.string().max(100).optional().nullable(),
  /** 추천사 — 왜 이 책을 권하는지. 이 모듈의 핵심 필드. */
  recommendation: z.string().max(5000).optional().nullable(),
  /** 구매/소개 링크. */
  link: z.string().max(1000).optional().nullable(),
  /** 추천한 날짜(목록 정렬·"이달의 책"에 쓰인다). */
  recommendedAt: z.string().max(40).optional().nullable(),
  sortOrder: z.number().int().optional(),
  /** 대표 추천 — 블록에서 크게 띄울 한 권. */
  isFeatured: z.boolean().optional(),
  status: z.enum(BOOK_STATUSES).default('published'),
}).passthrough();

export const updateBookSchema = createBookSchema.partial();

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
