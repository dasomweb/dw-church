# DW Church -- Setup Guide

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **pnpm 10+** (`corepack enable && corepack prepare pnpm@latest --activate`)
- **PostgreSQL 15+** (local or hosted -- Railway, Neon, Supabase, etc.)
- **Git**

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/dasomweb/dasom-church-management-system.git
cd dasom-church-management-system/dw-church-app
pnpm install
```

### 2. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env` and fill in your values. At minimum you need:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 32+ character secret for signing JWTs |
| `R2_ENDPOINT` | No | Cloudflare R2 S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | No | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | No | R2 API token secret key |
| `R2_BUCKET_NAME` | No | R2 bucket name (default: `dw-church-files`) |
| `R2_PUBLIC_URL` | No | Public URL for the R2 bucket (e.g. `https://pub-xxx.r2.dev`) |
| `RESEND_API_KEY` | No | Resend API key for transactional email |
| `EMAIL_FROM` | No | Sender address (default: `DW Church <noreply@truelight.app>`) |
| `SUPER_ADMIN_EMAILS` | No | Comma-separated list of super-admin email addresses |
| `STRIPE_SECRET_KEY` | No | Stripe secret key for billing |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `STRIPE_PRICE_BASIC` | No | Stripe Price ID for basic plan |
| `STRIPE_PRICE_PRO` | No | Stripe Price ID for pro plan |
| `SENTRY_DSN` | No | Sentry DSN for error monitoring |
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | `development`, `production`, or `test` |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

### 3. Set up the database

```bash
cd apps/server
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema to database (dev only)
# or
pnpm db:migrate    # Run migrations (production)
```

### 4. Start the dev server

```bash
# From dw-church-app root -- starts all apps in parallel
pnpm dev
```

The API server runs on `http://localhost:3000` by default.

---

## Railway Deployment (API Server)

Railway hosts the Express API server using `Dockerfile.server` at the repo root.

### Initial setup

1. Create a new project at [railway.app](https://railway.app).
2. Connect your GitHub repository.
3. Railway will detect `railway.toml` in the repo root automatically.

### railway.toml (already in repo root)

```toml
[build]
dockerfilePath = "Dockerfile.server"

[deploy]
healthcheckPath = "/api/v1/theme/presets"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### Environment variables

In the Railway dashboard, add all required env vars from the table above. At minimum:

- `DATABASE_URL` -- Use Railway's built-in PostgreSQL or an external DB.
- `JWT_SECRET` -- Generate with `openssl rand -hex 32`.
- `CORS_ORIGINS` -- Set to your frontend domains (e.g. `https://admin.truelight.app,https://truelight.app`).
- `NODE_ENV` -- Set to `production`.

### Auto-deploy

With the GitHub repo connected, Railway auto-deploys on every push to the main branch. The healthcheck at `/api/v1/theme/presets` ensures zero-downtime deploys -- Railway will only route traffic to the new container after it passes the healthcheck.

### Custom domain

In Railway service settings, add your custom domain (e.g. `api.truelight.app`) and configure DNS accordingly.

---

## Vercel Deployment (Web + Admin)

The Next.js web app (`apps/web`) and admin app (`packages/admin-app`) are deployed to Vercel.

### Web app (apps/web)

1. Import the repo in Vercel.
2. Set **Root Directory** to `dw-church-app`.
3. Set **Build Command** to `pnpm --filter @dw-church/web build`.
4. Set **Output Directory** to `apps/web/.next`.
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL` -- Your Railway API URL (e.g. `https://api.truelight.app`).
   - `REVALIDATE_SECRET` -- Secret for on-demand ISR revalidation.

### Admin app (packages/admin-app)

1. Create a separate Vercel project for the admin app.
2. Set **Root Directory** to `dw-church-app`.
3. Set **Build Command** to `pnpm --filter @dw-church/admin-app build`.
4. Add environment variables:
   - `VITE_API_BASE_URL` -- Your Railway API URL (e.g. `https://api.truelight.app`).

---

## Cloudflare R2 Setup

R2 provides S3-compatible object storage for file uploads (images, documents, etc.).

### 1. Create a bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > R2.
2. Create a new bucket named `dw-church-files` (or your preferred name).

### 2. Enable public access (optional but recommended)

1. In the bucket settings, enable **Public Access** via `r2.dev` subdomain.
2. Copy the public URL (e.g. `https://pub-abc123.r2.dev`) -- this becomes `R2_PUBLIC_URL`.

### 3. Create an API token

1. Go to R2 > **Manage R2 API Tokens**.
2. Create a token with **Object Read & Write** permission for your bucket.
3. Copy the credentials:
   - **Account ID** -- used in the endpoint URL.
   - **Access Key ID** -- becomes `R2_ACCESS_KEY_ID`.
   - **Secret Access Key** -- becomes `R2_SECRET_ACCESS_KEY`.

### 4. Set environment variables

```
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<access-key-id>
R2_SECRET_ACCESS_KEY=<secret-access-key>
R2_BUCKET_NAME=dw-church-files
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### Tenant cleanup

When a tenant is deleted, the server automatically removes all R2 files under that tenant's prefix. This is handled in the tenant deletion logic (see recent commit `3a4d38a`).

---

## Resend Email Setup

[Resend](https://resend.com) is used for transactional emails (invitations, password resets, etc.).

### 1. Create an account

Sign up at [resend.com](https://resend.com) and verify your sending domain.

### 2. Add your domain

1. Go to **Domains** and add your domain (e.g. `truelight.app`).
2. Add the required DNS records (SPF, DKIM, DMARC) to your DNS provider.
3. Wait for verification.

### 3. Create an API key

1. Go to **API Keys** and create a new key.
2. Copy the key -- it starts with `re_`.

### 4. Set environment variables

```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=DW Church <noreply@truelight.app>
```

If `RESEND_API_KEY` is not set, the server will skip sending emails silently.

---

## Stripe Setup

Stripe handles subscription billing. It is optional -- the app works without it.

### 1. Create products and prices

1. In the [Stripe Dashboard](https://dashboard.stripe.com), create two products:
   - **Basic Plan** -- create a recurring price, copy the Price ID (`price_xxx`).
   - **Pro Plan** -- create a recurring price, copy the Price ID (`price_xxx`).

### 2. Set up webhooks

1. Go to **Developers > Webhooks**.
2. Add an endpoint: `https://api.truelight.app/api/v1/billing/webhook`.
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copy the **Signing Secret** (`whsec_xxx`).

### 3. Set environment variables

```
STRIPE_SECRET_KEY=sk_test_xxx          # or sk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_BASIC=price_xxx
STRIPE_PRICE_PRO=price_xxx
```

---

## Troubleshooting

- **Healthcheck failing on Railway**: Make sure the server starts within 30 seconds. Check that `DATABASE_URL` is reachable from Railway's network.
- **R2 uploads failing**: Verify the API token has write permissions and the endpoint URL includes your account ID (not the bucket name).
- **Emails not sending**: Confirm your domain is verified in Resend and DNS records are propagated.
- **CORS errors**: Ensure `CORS_ORIGINS` includes all frontend domains (no trailing slashes).
