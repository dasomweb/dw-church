import { z } from 'zod';

/**
 * 책 추천 (book recommendation) 콘텐츠 모듈.
 *
 * 주 용도는 **이달의(또는 이번 주) 추천도서** — 한 권을 골라 크게 알리고,
 * 지난 추천들은 목록으로 쌓인다. 그래서 서지 정보보다 추천사가 핵심이다.
 */
export const BOOK_STATUSES = ['draft', 'published', 'archived'] as const;

/** 대표 추천의 주기 — 교회마다 월간/주간 운영이 갈린다. */
export const BOOK_PERIODS = ['month', 'week'] as const;

export const createBookSchema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(200).optional().nullable(),
  publisher: z.string().max(200).optional().nullable(),

  /**
   * 표지·소개 이미지 최대 2장. 앞표지 한 장으로는 부족한 경우가 많아
   * (뒤표지·목차·내지) 둘까지 허용한다. 배열 순서가 곧 표시 순서이고
   * 첫 장이 대표 이미지다. 비우면 블록이 제목 첫 글자로 자리를 채운다.
   */
  coverImageUrls: z.array(z.string().max(1000)).max(2).optional(),

  /** 분야 — 자유 입력(교회마다 분류가 다르다). */
  category: z.string().max(80).optional().nullable(),

  /** 추천사 — 왜 이 책을 권하는지. 이 모듈의 핵심 필드. */
  recommendation: z.string().max(5000).optional().nullable(),

  /**
   * 구입처 — 미주 한인교회라 **미국·한국 두 곳을 다 둔다.**
   * 성도마다 주문하는 곳이 다르고(아마존 vs 교보·알라딘) 한국 배송이 안 되는
   * 책도 있어, 한 곳만 두면 절반은 못 산다. 비운 쪽은 표시하지 않는다.
   */
  linkUs: z.string().max(1000).optional().nullable(),
  linkKr: z.string().max(1000).optional().nullable(),

  /** 추천한 날짜 — 목록 정렬과 "이달/이번 주" 표기에 쓰인다. */
  recommendedAt: z.string().max(40).optional().nullable(),

  /**
   * 게시 기간 — 이 기간에만 사이트에 노출된다. 비우면 제한 없음.
   * "이달의 추천도서"처럼 기간이 정해진 운영이라, 끝나는 날짜를 미리 넣어두면
   * 교회가 내리는 걸 잊어도 지난 추천이 계속 걸려 있지 않는다.
   */
  startDate: z.string().max(40).optional().nullable(),
  endDate: z.string().max(40).optional().nullable(),

  sortOrder: z.number().int().optional(),

  /** 대표 추천 — 블록에서 크게 띄울 한 권. */
  isFeatured: z.boolean().optional(),
  /** 대표 추천의 주기 표기(이달의 / 이번 주). isFeatured 일 때만 의미가 있다. */
  featuredPeriod: z.enum(BOOK_PERIODS).optional(),

  status: z.enum(BOOK_STATUSES).default('published'),
}).passthrough();

export const updateBookSchema = createBookSchema.partial();

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
