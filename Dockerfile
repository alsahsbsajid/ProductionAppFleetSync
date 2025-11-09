# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f package-lock.json ]; then \
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm i --frozen-lockfile; \
  else \
    echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy env vars for build (will be overridden at runtime)
ENV STRIPE_SECRET_KEY=dummy_for_build
ENV SUPABASE_SERVICE_ROLE_KEY=dummy_for_build
ENV NEXT_PUBLIC_SUPABASE_URL=dummy_for_build
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy_for_build

# Build the application
# Set SKIP_ENV_VALIDATION to allow build with dummy env vars
ENV SKIP_ENV_VALIDATION=true
RUN \
  if [ -f package-lock.json ]; then npm run build || (echo "Build failed, checking logs..." && exit 1); \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build || (echo "Build failed, checking logs..." && exit 1); \
  else npm run build || (echo "Build failed, checking logs..." && exit 1); \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install curl for health checks
RUN apk add --no-cache curl

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]