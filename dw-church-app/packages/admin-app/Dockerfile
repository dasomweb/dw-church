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
# admin-app's super-admin page builder imports @dw-church/blocks/builder,
# which pulls blocks/src/utilities/* — those import @dw-church/design-tokens.
# Without the blocks package's own node_modules (where pnpm symlinks that
# workspace dep), Rollup can't resolve the import and the vite build fails:
#   Rollup failed to resolve import "@dw-church/design-tokens" from
#   "/app/packages/blocks/src/utilities/block-style-resolver.ts"
COPY --from=deps /app/packages/blocks/node_modules ./packages/blocks/node_modules

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

# Build Vite SPA.
# VITE_API_BASE_URL 은 **빌드 시점에** 번들로 인라인된다(런타임 env 로는 못 들어간다).
# 이 SPA 는 여러 오리진에서 돈다 — admin.truelight.app, truelight.app/admin(슈퍼어드민
# 진입), 그리고 각 교회 도메인의 /admin — 그래서 same-origin "/api" 는 쓸 수 없고
# 항상 API 의 절대 호스트를 불러야 한다. 값이 비면 여러 호출부의 폴백이 ''(same-origin)
# 으로 떨어져 404 가 난다(실제로 truelight.app/admin/super-admin 이 이 때문에 깨졌다).
ARG VITE_API_BASE_URL=https://api.truelight.app
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN cd packages/admin-app && echo "[build] VITE_API_BASE_URL=$VITE_API_BASE_URL" && pnpm build

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
