# syntax=docker/dockerfile:1
# Project CRM (Next.js 16 + custom server.js with WebSocket). Build/run with docker compose.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# .env.local is mounted only for this step (NEXT_PUBLIC_* values are baked into the build); it never lands in the image
RUN --mount=type=secret,id=dotenv,target=/app/.env.local \
    NODE_OPTIONS=--max-old-space-size=2048 npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100
COPY --from=build --chown=node:node /app/package.json /app/server.js /app/next.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next ./.next
RUN mkdir -p public/uploads && chown node:node public/uploads
USER node
EXPOSE 3100
# server.js reads /app/.env.local, which docker-compose.yml mounts read-only
CMD ["node", "server.js"]
