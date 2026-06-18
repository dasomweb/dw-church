import { z } from 'zod';

/**
 * Site intake — the content a paying church fills in (per its plan) that the
 * super admin then uses to set up the site with the AI builder. Saved as a
 * free-form JSON blob so the form can evolve without schema churn; the customer
 * can save mid-way (draft) and resume, then submit.
 */
export const INTAKE_STATUSES = ['draft', 'submitted', 'built'] as const;

export const saveIntakeSchema = z.object({
  // data is keyed by section (greeting/about/staff/worship/...); shape owned by
  // the wizard UI. Stored as-is.
  data: z.record(z.any()),
});

export type SaveIntakeInput = z.infer<typeof saveIntakeSchema>;
