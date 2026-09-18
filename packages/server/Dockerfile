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
# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/node_modules ./node_modules/.server
# Flatten server node_modules if needed (npm workspace hoists to root, so root node_modules is sufficient)
USER appuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD wget -qO- http://localhost:3001/api/docs || exit 1
CMD ["node", "dist/main.js"]
