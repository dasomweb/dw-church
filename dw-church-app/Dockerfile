FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only the packages needed by server
COPY apps/server/package.json apps/server/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui-components/package.json packages/ui-components/
COPY packages/wp-plugin/package.json packages/wp-plugin/
COPY packages/admin-app/package.json packages/admin-app/
# wp-connector is a WordPress plugin (PHP), not a workspace package
COPY apps/demo/package.json apps/demo/
COPY apps/web/package.json apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy server source
COPY apps/server/ apps/server/

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
