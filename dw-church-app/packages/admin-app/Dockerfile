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

RUN pnpm install --frozen-lockfile

# ─── Build ────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api-client/node_modules ./packages/api-client/node_modules
COPY --from=deps /app/packages/ui-components/node_modules ./packages/ui-components/node_modules
COPY --from=deps /app/packages/admin-app/node_modules ./packages/admin-app/node_modules

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/api-client/ packages/api-client/
COPY packages/ui-components/ packages/ui-components/
COPY packages/admin-app/ packages/admin-app/

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
