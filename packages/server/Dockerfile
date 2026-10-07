# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/server/package.json ./packages/server/package.json
# Only server workspace deps for cache efficiency
RUN npm ci --workspace=@otb/server --include=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY . .
RUN npm run build --workspace=@otb/server

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Create logs dir and set ownership BEFORE switching user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
 && mkdir -p /app/logs && chown -R appuser:appgroup /app
COPY --from=builder --chown=appuser:appgroup /app/packages/server/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/packages/server/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/packages/server/node_modules ./node_modules/.server
USER appuser
EXPOSE 3001
# HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD wget -qO- http://localhost:3001/api/docs || exit 1
# Run migrations then start server
CMD ["sh", "-c", "node dist/database/run-migrations.js && node dist/main.js"]
