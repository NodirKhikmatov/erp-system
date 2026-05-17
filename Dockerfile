# syntax=docker/dockerfile:1
# Repositoriya ildizidan ishlang (build konteksti — `.`).
#
# Next.js (standart, ko‘p PaaS platformalar kutgan image):
#   docker build -t mebel-erp-web .
#
# Nest API:
#   docker build --target api -t mebel-erp-api .
#
# Alohida fayllar (deploy/CI bilan mos): apps/web/Dockerfile va apps/api/Dockerfile

# ───────────────────────── API (Nest + Prisma) ─────────────────────────
FROM node:20-alpine AS api
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps apps
COPY packages packages

RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=api

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]

# ───────────────────────── WEB — build ─────────────────────────
FROM node:20-alpine AS web-build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
COPY packages/types/package.json packages/types/
COPY packages/typescript-config packages/typescript-config
COPY packages/eslint-config packages/eslint-config

RUN pnpm install --frozen-lockfile
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

RUN pnpm turbo run build --filter=web

# ───────────────────────── WEB — runtime (standart image) ─────────────────────────
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=web-build /app/apps/web/public ./apps/web/public
COPY --from=web-build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
