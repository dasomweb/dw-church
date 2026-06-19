import { z } from 'zod';
import { designTokensSchema } from '@dw-church/design-tokens';

/**
 * Saved design sets — per-tenant named snapshots of the full design tokens
 * (the "color set + font set" the AI builder generates, plus any the operator
 * saves manually). Applying a set copies its tokens into the tenant's LIVE
 * theme (themes.settings.tokensV2). Foundation for letting operators keep,
 * compare, and switch between AI-generated design variations.
 */

export const DESIGN_SET_SOURCES = ['manual', 'ai', 'preset'] as const;
export type DesignSetSource = (typeof DESIGN_SET_SOURCES)[number];

export const createDesignSetSchema = z.object({
  name: z.string().min(1).max(200),
  source: z.enum(DESIGN_SET_SOURCES).optional(),
  tokens: designTokensSchema,
});

export const updateDesignSetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tokens: designTokensSchema.optional(),
});

export type CreateDesignSetInput = z.infer<typeof createDesignSetSchema>;
export type UpdateDesignSetInput = z.infer<typeof updateDesignSetSchema>;
