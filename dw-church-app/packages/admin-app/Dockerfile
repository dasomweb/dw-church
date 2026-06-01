# ──────────────────────────────────────────────
# Admin App (Vite SPA) — Railway Deployment
# Serves admin.truelight.app with same-origin /api proxy
# ──────────────────────────────────────────────

FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ─── Dependencies ─────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY apps/demo/package.json apps/demo/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui-components/package.json packages/ui-components/
COPY packages/admin-app/package.json packages/admin-app/
COPY packages/wp-plugin/package.json packages/wp-plugin/
# Phase 0 — new workspace packages imported from b2bsmart. Without these
# pnpm install --frozen-lockfile fails (admin-app depends on them).
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/blocks/package.json packages/blocks/

RUN pnpm install --frozen-lockfile

# ─── Build ────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api-client/node_modules ./packages/api-client/node_modules
COPY --from=deps /app/packages/ui-components/node_modules ./packages/ui-components/node_modules
COPY --from=deps /app/packages/admin-app/node_modules ./packages/admin-app/node_modules
COPY --from=deps /app/packages/design-tokens/node_modules ./packages/design-tokens/node_modules

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/api-client/ packages/api-client/
COPY packages/ui-components/ packages/ui-components/
COPY packages/admin-app/ packages/admin-app/
# Source for the two new workspace packages — admin-app imports
# DesignTokens types + helpers from design-tokens. (blocks is also
# copied so admin-app's lazy import resolution doesn't 404 when Phase
# 4b lands.)
COPY packages/design-tokens/ packages/design-tokens/
COPY packages/blocks/ packages/blocks/

# design-tokens has to build first — admin-app reads types from its dist.
RUN cd packages/design-tokens && pnpm build
RUN cd packages/api-client && pnpm build:js
RUN cd packages/ui-components && pnpm build:js

# Build Vite SPA — no VITE_API_BASE_URL needed, frontend uses same-origin /api
RUN cd packages/admin-app && pnpm build

# ─── Production (static + proxy) ──────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/packages/admin-app/dist ./dist
COPY --from=builder /app/packages/admin-app/server.js ./server.js

# Install only the runtime deps needed by server.js — avoids pnpm workspace
# symlink gymnastics. Two packages, pinned to major versions.
RUN npm install --omit=dev --no-package-lock express@4 http-proxy-middleware@3

EXPOSE 3000
CMD ["node", "server.js"]
