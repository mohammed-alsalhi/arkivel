FROM node:24-alpine AS base
RUN apk add --no-cache openssl

# ── Stage 1: Dependencies ──
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

# Public settings must match during compilation and when the server starts.
FROM base AS configured
ARG ARKIVEL_SITE_MODE=wiki
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000
ARG NEXT_PUBLIC_ARKIVEL_SKIN=folio
ARG NEXT_PUBLIC_ARKIVEL_NAME=Arkivel
ARG NEXT_PUBLIC_ARKIVEL_DESCRIPTION="A focused, self-hosted home for durable knowledge."
ARG NEXT_PUBLIC_ARKIVEL_WELCOME_TEXT=""
ARG NEXT_PUBLIC_ARKIVEL_LOGO=/brand/arkivel-logo.png
ARG NEXT_PUBLIC_ARKIVEL_LOGO_MARK=/brand/arkivel-logo.svg
ARG NEXT_PUBLIC_ARKIVEL_APP_ICON=/brand/arkivel-icon-512.png
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
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-ec", "if [ \"$ARKIVEL_SITE_MODE\" != \"product\" ]; then node node_modules/prisma/build/index.js migrate deploy; fi; exec node server.js"]
