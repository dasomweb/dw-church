FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root files. tsconfig.base.json is required — apps/server/
# tsconfig.json extends "../../tsconfig.base.json"; without it tsc can't
# resolve the strict settings, infers every zod schema as partial, and
# emits cascading TS2345 errors (build-pages/routes.ts pageSpec etc.).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy only the packages needed by server
COPY apps/server/package.json apps/server/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui-components/package.json packages/ui-components/
COPY packages/wp-plugin/package.json packages/wp-plugin/
COPY packages/admin-app/package.json packages/admin-app/
COPY packages/wp-connector/package.json packages/wp-connector/
# Phase 0 — design-tokens is now a server dep (themes/service.ts imports
# legacyThemeToTokens / designTokensSchema). Without this pnpm install
# --frozen-lockfile fails because the lock file references the workspace
# package but the package.json isn't on disk.
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/blocks/package.json packages/blocks/
COPY packages/theme-sets/package.json packages/theme-sets/
COPY apps/demo/package.json apps/demo/
COPY apps/web/package.json apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy server source
COPY apps/server/ apps/server/
# design-tokens + theme-sets source — server tsc resolves both packages
# through their `default` export which points at src/index.ts.
COPY packages/design-tokens/ packages/design-tokens/
COPY packages/theme-sets/ packages/theme-sets/

# Phase 11 fix (2026-06-02): build workspace packages BEFORE the server
# build. See root-level Dockerfile.server for the full reasoning.
RUN cd packages/design-tokens && pnpm build
RUN cd packages/theme-sets && pnpm build

# Generate Prisma client and build
RUN cd apps/server && pnpm db:generate && pnpm build

# ─── Production ──────────────────────────
FROM node:20-slim AS production
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/server/dist ./dist
COPY --from=base /app/apps/server/prisma ./prisma
COPY --from=base /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=base /app/apps/server/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/index.js"]
