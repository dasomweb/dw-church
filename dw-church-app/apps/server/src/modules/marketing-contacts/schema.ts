import { z } from 'zod';

/**
 * 주소록 (marketing_contacts) — 슈퍼어드민 이메일 마케팅 연락처.
 * email 은 소문자 정규화 + 유니크. tags 로 세그먼트(교단/지역/관심 등),
 * status 로 수신거부 관리. CSV/붙여넣기로 외부 주소록을 import.
 */
const emailField = z.string().trim().toLowerCase().email('올바른 이메일이 아닙니다').max(320);
const tagsField = z.array(z.string().trim().max(40)).max(30).optional();

export const createContactSchema = z.object({
  email: emailField,
  name: z.string().trim().max(160).optional(),
  tags: tagsField,
  status: z.enum(['subscribed', 'unsubscribed']).optional(),
  note: z.string().trim().max(300).optional(),
  source: z.string().trim().max(40).optional(),
});

export const updateContactSchema = z.object({
  email: emailField.optional(),
  name: z.string().trim().max(160).optional(),
  tags: tagsField,
  status: z.enum(['subscribed', 'unsubscribed']).optional(),
  note: z.string().trim().max(300).optional(),
});

// CSV/붙여넣기 import — csv 텍스트(헤더 자동 감지) 또는 rows 배열 중 하나.
export const importContactsSchema = z.object({
  csv: z.string().max(2_000_000).optional(),
  rows: z
    .array(
      z.object({
        email: z.string().trim().max(320),
        name: z.string().trim().max(160).optional(),
        tags: z.union([z.string(), z.array(z.string())]).optional(),
      }),
    )
    .max(50_000)
    .optional(),
  // 이 import 로 들어온 모든 연락처에 공통으로 붙일 태그.
  tags: tagsField,
  source: z.string().trim().max(40).optional(),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  tag: z.string().trim().max(40).optional(),
  status: z.enum(['subscribed', 'unsubscribed', 'all']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(200).optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ImportContactsInput = z.infer<typeof importContactsSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
