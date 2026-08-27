# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm exec prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN pnpm run build

# ---- prod-deps ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json prisma.config.ts ./

EXPOSE 4000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
