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

  // AI Builder — Phase 11-A2 (apps/agents Python 서비스 연동).
  // AGENTS_BASE_URL    = Railway 의 apps/agents 내부 URL
  //                      (예: agents-production-xxxx.up.railway.app)
  // INTERNAL_SERVICE_TOKEN = server ↔ agents 양쪽이 공유하는 bearer.
  //                          기본 빈값 → planner-proxy 가 503 'AI builder
  //                          not configured' 응답. AI 빌더 비활성.
  AGENTS_BASE_URL: z.string().default(''),
  INTERNAL_SERVICE_TOKEN: z.string().default(''),

  // Monitoring (optional)
  SENTRY_DSN: z.string().default(''),

  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Custom-domain CNAME target shown to tenants when they connect their
  // own domain. With Cloudflare for SaaS, this is customers.truelight.app
  // (our orange-cloud proxied origin entry). Tenants add CNAME @/www to
  // this value. See docs/multitenant-domains/.
  WEB_CNAME_TARGET: z.string().default('customers.truelight.app'),

  // Cloudflare for SaaS — multi-tenant custom domain stack.
  // CF_API_TOKEN  = bearer token (Zone.SSL & Certificates: Edit,
  //                 Zone.Custom Hostnames: Edit, Account.SSL: Edit)
  // CF_ZONE_ID    = truelight.app zone id (Cloudflare dashboard sidebar)
  // CF_FALLBACK_ORIGIN = the host Cloudflare for SaaS routes Custom
  //                      Hostname traffic to. With Worker (saas-proxy)
  //                      enabled, set this to saas-proxy.truelight.app.
  // SAAS_PROXY_SECRET = shared secret between the Worker and middleware,
  //                     stamped as X-Tenant-Verify so middleware can
  //                     trust X-Tenant-Host. Must match the Worker's
  //                     SAAS_PROXY_SECRET secret exactly.
  // All optional; if missing, domain registration falls back to a
  // "not configured" error message in the admin UI.
  CF_API_TOKEN: z.string().default(''),
  CF_ZONE_ID: z.string().default(''),
  CF_FALLBACK_ORIGIN: z.string().default('customers.truelight.app'),
  SAAS_PROXY_SECRET: z.string().default(''),

  // Legacy Railway customDomainCreate path — kept for backward compat
  // during transition. To be removed once all tenants are on Cloudflare
  // for SaaS path.
  RAILWAY_API_TOKEN: z.string().default(''),
  RAILWAY_WEB_SERVICE_ID: z.string().default(''),
  RAILWAY_ENVIRONMENT_ID: z.string().default(''),
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
