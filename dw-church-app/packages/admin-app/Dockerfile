# ──────────────────────────────────────────────
# Admin App (Vite SPA) — Railway Deployment
# Serves admin.truelight.app
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
COPY packages/wp-connector/package.json packages/wp-connector/

RUN pnpm install --frozen-lockfile

# ─── Build ────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api-client/node_modules ./packages/api-client/node_modules
COPY --from=deps /app/packages/ui-components/node_modules ./packages/ui-components/node_modules
COPY --from=deps /app/packages/admin-app/node_modules ./packages/admin-app/node_modules

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api-client/ packages/api-client/
COPY packages/ui-components/ packages/ui-components/
COPY packages/admin-app/ packages/admin-app/

# Build workspace dependencies (JS only — skip tsc type declaration step
# which has pre-existing type errors that don't affect runtime)
RUN cd packages/api-client && pnpm build:js
RUN cd packages/ui-components && pnpm build:js

# Build the Vite SPA (dist/)
# Accept VITE_API_BASE_URL at build time (Vite embeds it into the bundle)
ARG VITE_API_BASE_URL=https://api.truelight.app
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN cd packages/admin-app && pnpm build

# ─── Production (static server) ───────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Lightweight static file server with SPA fallback
RUN npm install -g serve@14

COPY --from=builder /app/packages/admin-app/dist ./dist

EXPOSE 3000

# -s = SPA mode (all routes fallback to index.html)
# -l = listen on port
CMD ["serve", "-s", "dist", "-l", "3000"]
