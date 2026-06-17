import { z } from 'zod';

/**
 * 고객지원 티켓. Tenant admins submit; super-admin manages from the console.
 * Platform-level (public schema) — tickets reference a tenant by slug.
 */
export const SUPPORT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const createSupportTicketSchema = z.object({
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  // Optional contact override; otherwise we use the authenticated user's email.
  email: z.string().email().max(200).optional().nullable(),
  name: z.string().max(100).optional().nullable(),
});

export const updateSupportTicketSchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  adminReply: z.string().max(5000).optional().nullable(),
  // When true, email the adminReply to the ticket's contact.
  sendReply: z.boolean().optional(),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type UpdateSupportTicketInput = z.infer<typeof updateSupportTicketSchema>;
