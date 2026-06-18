import { z } from 'zod';

/**
 * Email / SMTP settings — super-admin-managed outbound mail config (single row).
 * SMTP credentials + the from-addresses (info / order / support). Lets the
 * operator point outbound mail at their provider (e.g. SiteGround SMTP) and
 * change accounts/passwords without a redeploy.
 */
export const updateEmailSettingsSchema = z.object({
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().max(255).optional(),
  smtpPass: z.string().max(500).optional(), // only updated when a non-empty value is sent
  fromInfo: z.string().max(255).optional(),
  fromOrder: z.string().max(255).optional(),
  fromSupport: z.string().max(255).optional(),
  fromName: z.string().max(100).optional(),
});

export const testEmailSchema = z.object({ to: z.string().email() });

export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;
