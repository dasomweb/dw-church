import { z } from 'zod';

// camelCase to match the api-client payload: the form sends `date` (not
// sermon_date) and `preacher` as a NAME (the service resolves it to an id).
// URLs are plain strings so empties don't 400.
export const createSermonSchema = z.object({
  title: z.string().min(1).max(300),
  scripture: z.string().max(500).optional().nullable(),
  youtubeUrl: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  preacher: z.string().max(200).optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
  categoryIds: z.array(z.string()).optional().default([]),
  // 설교 스터디 (13a 설교 매거진). 한줄요약·써머리(요약 본문) + 질문 3종(문자열 배열).
  oneLineSummary: z.string().max(400).optional().nullable(),
  summary: z.string().max(8000).optional().nullable(),
  observationQuestions: z.array(z.string().max(1000)).optional(),
  deepQuestions: z.array(z.string().max(1000)).optional(),
  applicationQuestions: z.array(z.string().max(1000)).optional(),
  // 리디자인 — 메타
  subtitle: z.string().max(500).optional().nullable(),
  serviceType: z.string().max(100).optional().nullable(),   // 예배 구분(주일설교/수요예배…)
  series: z.string().max(200).optional().nullable(),
  slug: z.string().max(200).optional().nullable(),
  tags: z.array(z.string().max(60)).optional(),
  language: z.string().max(20).optional().nullable(),
  seoSummary: z.string().max(1000).optional().nullable(),
  // 설교 원고 — 비공개 전문(운영자 작업용, 웹 미노출)
  manuscript: z.string().max(200000).optional().nullable(),
  // 리디자인 — 지면 구성(멀티 섹션): 각 단 = 소제목 + 본문 + 사진 + 캡션 + 대체텍스트
  body: z.array(z.object({
    subtitle: z.string().max(300).optional().nullable(),
    body: z.string().max(50000).optional().nullable(),
    imageUrl: z.string().max(2000).optional().nullable(),
    caption: z.string().max(500).optional().nullable(),
    alt: z.string().max(500).optional().nullable(),
  }).passthrough()).optional(),
  // 리디자인 — 영상/게시
  videoStartAt: z.string().max(20).optional().nullable(),   // 영상 시작 지점(예: 90 또는 1:30)
  scheduledAt: z.string().optional().nullable(),            // 공개 예약(ISO datetime)
  homeFeatured: z.boolean().optional(),                     // 홈 대표글
  allowComments: z.boolean().optional(),                    // 댓글 허용
}).passthrough();

export const updateSermonSchema = createSermonSchema.partial();

export type CreateSermonInput = z.infer<typeof createSermonSchema>;
export type UpdateSermonInput = z.infer<typeof updateSermonSchema>;
