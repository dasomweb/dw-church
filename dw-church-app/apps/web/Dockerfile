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
# Phase 0 — apps/web doesn't yet import design-tokens/blocks, but pnpm
# install --frozen-lockfile fails on missing workspace members listed in
# the lock file. Include them so the install resolves.
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/blocks/package.json packages/blocks/
COPY packages/theme-sets/package.json packages/theme-sets/
# wp-connector is a WordPress plugin (PHP), not a workspace package

RUN pnpm install --frozen-lockfile

# ─── Build ────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api-client/node_modules ./packages/api-client/node_modules
COPY --from=deps /app/packages/ui-components/node_modules ./packages/ui-components/node_modules
# Phase 10-α / 11 fix (2026-06-03): design-tokens + theme-sets are now built
# in this stage (pnpm build), and their node_modules (zod for design-tokens,
# zod + workspace ref for theme-sets) must be present or tsc fails with
# "Cannot find module 'zod'". Missing these COPYs is what caused the cascading
# unknown-type errors in contrast.ts and to-css-vars.ts — zod types disappeared
# so the schema types degraded to unknown.
COPY --from=deps /app/packages/design-tokens/node_modules ./packages/design-tokens/node_modules
COPY --from=deps /app/packages/theme-sets/node_modules ./packages/theme-sets/node_modules
# @dw-church/blocks is now the storefront block set (transpilePackages). Its
# node_modules holds the symlinks to ui-components/design-tokens it imports.
COPY --from=deps /app/packages/blocks/node_modules ./packages/blocks/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source for workspace packages needed by web
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/api-client/ packages/api-client/
COPY packages/ui-components/ packages/ui-components/
# Phase 6-A added BrandTokensStyle.tsx that imports @dw-church/design-tokens.
# Phase 10-α added theme-sets imports. Both packages need to be copied AND built
# before the Next.js build so webpack can resolve them via package.json exports.
COPY packages/design-tokens/ packages/design-tokens/
COPY packages/theme-sets/ packages/theme-sets/
COPY packages/blocks/ packages/blocks/
COPY apps/web/ apps/web/

# Build workspace dependencies first (dist/ required by package.json exports)
# Skip tsc declarations (build:js) — type errors in source don't affect runtime
RUN cd packages/api-client && pnpm build:js
RUN cd packages/ui-components && pnpm build:js
RUN cd packages/design-tokens && pnpm build
RUN cd packages/theme-sets && pnpm build

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
