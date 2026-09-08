import { z } from 'zod';

/**
 * 말씀 묵상 (daily devotion / QT) — Claude Design 14번(개인 묵상) 기반 콘텐츠 모듈.
 * 관리자가 하루치 묵상을 업로드하고 스토어프론트가 주간 목록 + 오늘 묵상으로 표시.
 *
 * ⚠️ 저작권: 성경 본문 전문은 저장하지 않는다. scriptureRef(참조)만 필수이고,
 * verse(핵심 구절 텍스트)는 교회가 라이선스 있는 번역본으로 채우는 선택 필드.
 * reflection/question/prayer 는 교회가 작성하는 창작 콘텐츠.
 */
export const DEVOTION_STATUSES = ['draft', 'published', 'archived'] as const;

export const createDevotionSchema = z.object({
  title: z.string().min(1).max(300), // 묵상 제목
  devoDate: z.string().max(40).optional().nullable(), // 묵상 날짜 (YYYY-MM-DD 등 자유형식)
  dayLabel: z.string().max(40).optional().nullable(), // 예: "1일차" · "월"
  scriptureRef: z.string().max(200).optional().nullable(), // 시편 1편 (참조 — 본문 전문 아님)
  verse: z.string().max(2000).optional().nullable(), // 핵심 구절 텍스트 (저작권 유의 — 선택)
  reflection: z.string().max(20000).optional().nullable(), // 묵상 본문 (창작)
  question: z.string().max(4000).optional().nullable(), // 묵상 질문 (창작)
  prayer: z.string().max(4000).optional().nullable(), // 기도 (창작)
  imageUrl: z.string().max(1000).optional().nullable(), // 대표 이미지 (선택)
  sortOrder: z.number().int().optional(),
  status: z.enum(DEVOTION_STATUSES).default('published'),
});

export const updateDevotionSchema = createDevotionSchema.partial();

export type CreateDevotionInput = z.infer<typeof createDevotionSchema>;
export type UpdateDevotionInput = z.infer<typeof updateDevotionSchema>;
