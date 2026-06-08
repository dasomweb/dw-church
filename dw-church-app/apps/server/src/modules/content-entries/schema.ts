import { z } from 'zod';

// Content entries = the CONTENT layer, separated from the DESIGN layer
// (page_sections). A reusable bag of content fields (title/content/imageUrl…)
// that a Static Block section can reference via props.contentEntryId instead
// of inlining the content. Existing sections keep inlining props (non-
// destructive); referencing is opt-in.
export const createContentEntrySchema = z.object({
  // Block type the content is shaped for (e.g. 'text_image', 'hero_banner').
  type: z.string().min(1).max(64),
  // Operator-facing label so the entry is pickable from a list.
  name: z.string().min(1).max(200),
  // The content fields (title, content, imageUrl, …). Design fields
  // (blockStyle, variant) stay on the section, not here.
  data: z.record(z.unknown()).default({}),
});

export const updateContentEntrySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  data: z.record(z.unknown()).optional(),
});

export type CreateContentEntryInput = z.infer<typeof createContentEntrySchema>;
export type UpdateContentEntryInput = z.infer<typeof updateContentEntrySchema>;
