import { z } from 'zod';

export const slugPattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export const registerSchema = z.object({
  churchName: z.string().min(1).max(200),
  slug: z
    .string()
    .min(3)
    .max(63)
    .regex(slugPattern, 'Slug must be alphanumeric with hyphens, 3-63 chars'),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  ownerName: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'editor', 'member']),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
