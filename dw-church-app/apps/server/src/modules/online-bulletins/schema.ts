import { z } from 'zod';

// 온라인 주보 (online_bulletin) — 문서 업로드형 주보(bulletins)와 별개.
// content(jsonb) 한 필드에 예배순서·찬양악보·대표기도·성경본문·기도제목·마지막찬양·
// 주일광고·소그룹질문을 담는다. content 내부 구조는 유연하게(record) 받아 스키마
// 변화에 400 나지 않게 한다 — 운영자 입력이라 inner shape 검증은 클라이언트 타입으로.
// 필드는 camelCase(api-client 가 camelCase 로 보냄), URL 은 plain string.
export const createOnlineBulletinSchema = z.object({
  title: z.string().min(1).max(500),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  content: z.record(z.unknown()).default({}),
  // 기본값은 공개 — 교회가 글을 올리면 바로 보이는 게 기대 동작이다(대표님 지시).
  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateOnlineBulletinSchema = createOnlineBulletinSchema.partial();

export type CreateOnlineBulletinInput = z.infer<typeof createOnlineBulletinSchema>;
export type UpdateOnlineBulletinInput = z.infer<typeof updateOnlineBulletinSchema>;
