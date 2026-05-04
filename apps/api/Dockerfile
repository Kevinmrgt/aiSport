# ─── Stage 1 : Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copier les manifestes pour le cache des dépendances
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Installer les dépendances (frozen pour reproductibilité — OWASP A08)
RUN pnpm install --frozen-lockfile

# Copier les sources
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./

# Build shared puis api
RUN pnpm --filter shared build
RUN pnpm --filter api build

# ─── Stage 2 : Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copier les manifestes pour installer uniquement les dépendances de prod
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

# Copier les artefacts de build
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle

# Utilisateur non-root (OWASP A05 — principe du moindre privilège)
RUN addgroup -g 1001 -S nodejs && adduser -S hono -u 1001
USER hono

WORKDIR /app/apps/api

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/src/index.js"]
