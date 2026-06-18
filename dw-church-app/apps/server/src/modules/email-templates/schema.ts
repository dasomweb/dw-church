import { z } from 'zod';

/**
 * Editable email templates (super-admin). Each template's body is inner HTML
 * (wrapped in the clean shell at render time) and may contain {{variables}} and
 * a {{button}} placeholder for the action button.
 */
export const updateTemplateSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  body: z.string().max(20000).optional(),
});

export const testTemplateSchema = z.object({ to: z.string().email() });

// Live preview of (possibly unsaved) subject/body — renders the design shell.
export const previewTemplateSchema = z.object({
  subject: z.string().max(300).optional(),
  body: z.string().max(20000).optional(),
});

export const broadcastSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(50000), // inner HTML
  testTo: z.string().email().optional(), // when set, send only to this address (preview)
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
