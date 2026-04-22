# ──────────────────────────────────────────────
# Next.js Web App — Railway Deployment
# Serves *.truelight.app (public tenant sites)
# ──────────────────────────────────────────────

FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ─── Dependencies ─────────────────────────────
FROM base AS deps
# Copy workspace manifests for efficient layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY apps/demo/package.json apps/demo/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui-components/package.json packages/ui-components/
COPY packages/admin-app/package.json packages/admin-app/
COPY packages/wp-plugin/package.json packages/wp-plugin/
COPY packages/wp-connector/package.json packages/wp-connector/

RUN pnpm install --frozen-lockfile

# ─── Build ────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api-client/node_modules ./packages/api-client/node_modules
COPY --from=deps /app/packages/ui-components/node_modules ./packages/ui-components/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source for workspace packages needed by web
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api-client/ packages/api-client/
COPY packages/ui-components/ packages/ui-components/
COPY apps/web/ apps/web/

# Note: apps/web uses Next.js `transpilePackages` to consume workspace
# packages directly from source — no prebuild needed for api-client / ui-components.

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && pnpm build

# ─── Production ───────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

# Copy standalone build (includes minimal server.js + required node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

# Standalone server expects to be run from the app root
CMD ["node", "apps/web/server.js"]
