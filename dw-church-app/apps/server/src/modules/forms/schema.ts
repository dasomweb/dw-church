import { z } from 'zod';

/**
 * Generic form-submission content module. ONE table (form_submissions) backs
 * every storefront form — 문의(contact), 목장사역보고서(cell_report),
 * 새가족(newcomer), and any operator-defined custom form. The form's FIELDS are
 * defined by the storefront block's props (the operator configures them in the
 * page editor); each submission stores the raw key/value payload as JSONB plus
 * a heuristically-extracted submitter name/contact for the inbox list.
 *
 * This is the foundation for the future 교적관리 (membership) system — member
 * records will reference / be promoted from these submissions.
 */

export const FORM_SUBMISSION_STATUSES = ['new', 'read', 'done', 'archived'] as const;
export type FormSubmissionStatus = (typeof FORM_SUBMISSION_STATUSES)[number];

// Known form types — extensible. A new operator-defined form just uses a new
// type string (validated by formTypeSchema) without a server change.
export const FORM_TYPES = ['contact', 'cell_report', 'newcomer', 'prayer', 'volunteer', 'custom'] as const;

// formType path param: lowercase letter start, letters/digits/underscore,
// 2–40 chars. Keeps one generic endpoint usable for future form types.
export const formTypeSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,39}$/, 'invalid form type');

// Public submit — arbitrary key/value payload. name/email/phone are typed when
// present (the blocks send them) and any other field is accepted via catchall
// so the operator can add fields without a schema change. Nested objects are
// rejected to keep payloads flat + the inbox readable.
export const submitFormSchema = z
  .object({
    name: z.string().max(200).optional(),
    email: z.string().max(300).optional(),
    phone: z.string().max(120).optional(),
  })
  .catchall(z.union([z.string().max(5000), z.number(), z.boolean(), z.null(), z.array(z.string().max(2000))]));

export const updateFormSubmissionSchema = z.object({
  status: z.enum(FORM_SUBMISSION_STATUSES).optional(),
  memo: z.string().max(5000).optional(),
});

export type SubmitFormInput = z.infer<typeof submitFormSchema>;
export type UpdateFormSubmissionInput = z.infer<typeof updateFormSubmissionSchema>;
