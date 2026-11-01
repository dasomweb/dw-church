import { z } from 'zod';

// camelCase to match the api-client payload; URLs plain strings (no .url()) so
// empties don't 400; image fields raised to 2000 for R2 URLs.
export const createColumnSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().optional().nullable(),
  topImageUrl: z.string().max(2000).optional().nullable(),
  bottomImageUrl: z.string().max(2000).optional().nullable(),
  youtubeUrl: z.string().max(500).optional().nullable(),
  thumbnailUrl: z.string().max(2000).optional().nullable(),

  /**
   * 예약 공개 — 이 기간에만 사이트에 노출된다(YYYY-MM-DD). 둘 다 비우면 제한 없음.
   *
   * 목회컬럼은 주 단위로 미리 써 두는 글이라, 공개 시작일을 넣어 두면 그 날이
   * 되어야 사이트에 나온다(스케줄러 없이 읽을 때 걸러낸다 — service.ts IN_WINDOW).
   * 종료일을 넣으면 그 날이 지나면 저절로 내려간다(연재·절기 칼럼).
   * 기준일은 교회 현지 날짜(미 동부) — UTC 로 보면 전날 저녁에 떠 버린다.
   */
  publishAt: z.string().max(40).optional().nullable(),
  unpublishAt: z.string().max(40).optional().nullable(),

  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateColumnSchema = createColumnSchema.partial();

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
