import { z } from 'zod';

// 설교노트 (sermon_notes) — 온라인 주보와 별개의 콘텐츠 모듈. 주일(note_date)별로
// 회중(장년/EM/Youth/어린이/Kids)별 설교노트 + 소그룹 나눔질문을 content(jsonb)에 담는다.
// 온라인 주보의 설교노트 섹션은 해당 주일 날짜로 이 모듈에서 끌어와 표시.
// content 내부 구조는 유연하게(record) — 운영자 입력이라 inner shape 는 클라이언트 타입으로.
export const createSermonNoteSchema = z.object({
  title: z.string().max(500).optional().default(''),
  noteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  content: z.record(z.unknown()).default({}),
  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateSermonNoteSchema = createSermonNoteSchema.partial();

export type CreateSermonNoteInput = z.infer<typeof createSermonNoteSchema>;
export type UpdateSermonNoteInput = z.infer<typeof updateSermonNoteSchema>;
