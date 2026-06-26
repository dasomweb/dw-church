import { z } from 'zod';

const sourceSchema = z.object({
  type: z.enum(['uploads', 'playlist', 'live']),
  id: z.string().min(1),
  title: z.string().default(''),
  count: z.number().nullable().default(null),
});

const videoItem = z.object({
  videoId: z.string(),
  title: z.string(),
  description: z.string().default(''),
  publishedAt: z.string().default(''),
  url: z.string(),
  thumbnailUrl: z.string(),
  scripture: z.string().default(''),
  sermonDate: z.string().default(''),
});

export const youtubeSourcesSchema = z.object({
  channel: z.string().min(1, '채널 URL/ID/@핸들을 입력하세요'),
});

export const youtubeFetchSchema = z.object({
  source: sourceSchema,
  target: z.enum(['sermons', 'videos']),
});

export const youtubeApplySchema = z.object({
  target: z.enum(['sermons', 'videos']),
  status: z.enum(['draft', 'published']).default('published'),
  categoryId: z.string().uuid().optional().nullable(),
  preacher: z.string().max(200).optional().nullable(),
  videos: z.array(videoItem).min(1, '가져올 영상을 한 개 이상 선택하세요').max(1000),
});

export type YoutubeSourcesInput = z.infer<typeof youtubeSourcesSchema>;
export type YoutubeFetchInput = z.infer<typeof youtubeFetchSchema>;
export type YoutubeApplyInput = z.infer<typeof youtubeApplySchema>;
