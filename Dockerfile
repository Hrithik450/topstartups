# syntax=docker/dockerfile:1

# ─── Multi-stage Next.js Dockerfile for VPS and Cloud Deployment ───
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ─── Step 1: Install Dependencies ───
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ─── Step 2: Build Application ───
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy build-time placeholders (real secrets are injected at container runtime)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_SSL=false

RUN npm run build

# ─── Step 3: Production Runner ───
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build & static files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
