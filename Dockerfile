# ==============================================================================
# Stage 1: Frontend Production Build (Vite + TypeScript)
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Hardened Production Runtime (Node 22 Native SQLite + Zero-Trust API)
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Create persistent data volume directory with strict ownership
RUN mkdir -p /app/server/data && chown -R node:node /app

COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server ./server

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "server/index.js"]
