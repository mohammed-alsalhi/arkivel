FROM node:24-alpine AS base
RUN apk add --no-cache openssl postgresql-client

# ── Stage 1: Dependencies ──
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

# Public settings must match during compilation and when the server starts.
# Empty values fall back to the defaults in src/lib/config.ts.
FROM base AS configured
ARG ARKIVEL_SITE_MODE=""
ARG NEXT_PUBLIC_BASE_URL=""
ARG NEXT_PUBLIC_ARKIVEL_SKIN=""
ARG NEXT_PUBLIC_ARKIVEL_NAME=""
ARG NEXT_PUBLIC_ARKIVEL_DESCRIPTION=""
ARG NEXT_PUBLIC_ARKIVEL_WELCOME_TEXT=""
ARG NEXT_PUBLIC_ARKIVEL_LOGO=""
ARG NEXT_PUBLIC_ARKIVEL_LOGO_MARK=""
ARG NEXT_PUBLIC_ARKIVEL_APP_ICON=""
ENV ARKIVEL_SITE_MODE=$ARKIVEL_SITE_MODE \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_ARKIVEL_SKIN=$NEXT_PUBLIC_ARKIVEL_SKIN \
    NEXT_PUBLIC_ARKIVEL_NAME=$NEXT_PUBLIC_ARKIVEL_NAME \
    NEXT_PUBLIC_ARKIVEL_DESCRIPTION=$NEXT_PUBLIC_ARKIVEL_DESCRIPTION \
    NEXT_PUBLIC_ARKIVEL_WELCOME_TEXT=$NEXT_PUBLIC_ARKIVEL_WELCOME_TEXT \
    NEXT_PUBLIC_ARKIVEL_LOGO=$NEXT_PUBLIC_ARKIVEL_LOGO \
    NEXT_PUBLIC_ARKIVEL_LOGO_MARK=$NEXT_PUBLIC_ARKIVEL_LOGO_MARK \
    NEXT_PUBLIC_ARKIVEL_APP_ICON=$NEXT_PUBLIC_ARKIVEL_APP_ICON

# ── Stage 2: Builder ──
FROM configured AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ── Stage 3: Runner ──
FROM configured AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/scripts/bootstrap-owner.mjs ./scripts/bootstrap-owner.mjs
COPY --from=builder /app/scripts/backup ./scripts/backup
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-ec", "node node_modules/prisma/build/index.js migrate deploy; exec node server.js"]
