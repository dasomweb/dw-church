import { z } from 'zod';

/**
 * Form Builder — operator-designed custom forms (목장보고서 / 새가족 / 문의 …).
 *
 * A `form` (forms table) has a name + slug + a list of `fields` (form_fields).
 * Submissions are NOT stored here — they reuse the generic form_submissions table
 * (form_type = the form's slug), so they land in the existing 폼 제출 inbox and the
 * builder stays focused on *defining* forms. The slug doubles as the form_type, so
 * it must satisfy the same shape the public submit endpoint accepts.
 */

// Church-appropriate field types. Deliberately a subset of B2B form builders —
// no file upload (needs the R2 flow) or url/payment fields in v1.
export const FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'phone',
  'number',
  'date',
  'select',
  'radio',
  'checkbox',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

// Types whose answer is constrained to a fixed option list.
export const CHOICE_FIELD_TYPES: FieldType[] = ['select', 'radio', 'checkbox'];

// slug == form_type: lowercase start, letters/digits/underscore, 2–40 chars.
// Identical to forms/schema.ts formTypeSchema so the public submit path accepts it.
export const slugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,39}$/, 'slug은 영문 소문자로 시작하고 영문/숫자/밑줄 2~40자여야 합니다');

// field_key: snake_case, used as the payload key for a field's answer.
const fieldKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,49}$/, 'field_key는 영문 소문자로 시작하는 snake_case여야 합니다');

const optionSchema = z.object({
  value: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
});

export const createFormSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema,
  description: z.string().max(2000).default(''),
  submitLabel: z.string().max(100).default('제출'),
  successMessage: z.string().max(2000).default('제출해 주셔서 감사합니다.'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

// Update: every field optional; slug is immutable once created (it is the
// form_type that submissions are filed under — changing it would orphan them).
export const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  submitLabel: z.string().max(100).optional(),
  successMessage: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createFieldSchema = z.object({
  fieldKey: fieldKeySchema,
  fieldType: z.enum(FIELD_TYPES),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).default(''),
  helpText: z.string().max(500).default(''),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  options: z.array(optionSchema).max(50).default([]),
});

export const updateFieldSchema = z.object({
  fieldKey: fieldKeySchema.optional(),
  fieldType: z.enum(FIELD_TYPES).optional(),
  label: z.string().min(1).max(200).optional(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  options: z.array(optionSchema).max(50).optional(),
});

// Reorder: ordered list of field ids; index becomes the new sort_order.
export const reorderFieldsSchema = z.object({
  fieldIds: z.array(z.string().uuid()).max(100),
});

export type CreateFormInput = z.infer<typeof createFormSchema>;
export type UpdateFormInput = z.infer<typeof updateFormSchema>;
export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
