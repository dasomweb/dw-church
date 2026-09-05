import { z } from 'zod';

/**
 * Editable email templates (super-admin). Each template's body is inner HTML
 * (wrapped in the clean shell at render time) and may contain {{variables}} and
 * a {{button}} placeholder for the action button.
 */
export const updateTemplateSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  body: z.string().max(20000).optional(),
  heroImageUrl: z.string().max(1000).optional(), // R2 URL of the top banner image ('' clears)
});

export const testTemplateSchema = z.object({ to: z.string().email() });

// Live preview of (possibly unsaved) subject/body — renders the design shell.
export const previewTemplateSchema = z.object({
  subject: z.string().max(300).optional(),
  body: z.string().max(20000).optional(),
  heroImageUrl: z.string().max(1000).optional(),
});

// 'contacts' = 주소록(marketing_contacts)의 구독 연락처. contactTags 로 세그먼트 필터.
export const BROADCAST_AUDIENCES = ['admins', 'demo', 'applications', 'contacts'] as const;

export const broadcastSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(50000), // inner HTML
  testTo: z.string().email().optional(), // when set, send only to this address (preview)
  // Marketing/announcement recipients. Empty → defaults to 'admins' (legacy 공지).
  audiences: z.array(z.enum(BROADCAST_AUDIENCES)).optional(),
  contactTags: z.array(z.string().trim().max(40)).max(30).optional(), // 'contacts' 대상일 때 태그 필터
  customEmails: z.string().max(50000).optional(), // pasted addresses (comma/newline/semicolon)
  heroImageUrl: z.string().max(1000).optional(), // 상단 배너 이미지(R2 URL)
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
