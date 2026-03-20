import { z } from 'zod';

export const templateNames = [
  'modern',
  'classic',
  'minimal',
  'warm',
  'formal',
  'dark',
  'visual',
  'simple',
  'traditional',
  'youth',
] as const;

export type TemplateName = (typeof templateNames)[number];

export const colorsSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  background: z.string().optional(),
  surface: z.string().optional(),
  text: z.string().optional(),
});

export const fontsSchema = z.object({
  heading: z.string().optional(),
  body: z.string().optional(),
});

export const updateThemeSchema = z.object({
  templateName: z.enum(templateNames).optional(),
  colors: colorsSchema.optional(),
  fonts: fontsSchema.optional(),
  customCss: z.string().max(50000).optional(),
});

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
