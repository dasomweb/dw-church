import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),

  R2_ENDPOINT: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME: z.string().default('dw-church-files'),
  R2_PUBLIC_URL: z.string().default(''),

  SUPER_ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  // Email SMTP (optional — emails are skipped if not configured)
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('True Light <mailer@truelight.app>'),

  // Stripe billing (optional — only required if billing is enabled)
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PRICE_BASIC: z.string().default(''),
  STRIPE_PRICE_PRO: z.string().default(''),

  // AI (optional — Gemini for text/image generation)
  GEMINI_API_KEY: z.string().default(''),

  // Monitoring (optional)
  SENTRY_DSN: z.string().default(''),

  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Custom-domain CNAME target shown to tenants when they connect their own
  // domain. Points to the Railway web service's public hostname so their
  // traffic reaches us. Defaults to the current production web service.
  WEB_CNAME_TARGET: z.string().default('web-production-1f18f.up.railway.app'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}

export const env = validateEnv();
