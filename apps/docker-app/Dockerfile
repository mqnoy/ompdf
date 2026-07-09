# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS package-builder

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/ompdf/package.json packages/ompdf/package.json

RUN pnpm install --frozen-lockfile --filter ompdf...

COPY packages/ompdf packages/ompdf

RUN pnpm --filter ompdf build \
    && mkdir -p /artifacts \
    && pnpm --filter ompdf pack --pack-destination /artifacts

FROM node:22-bookworm-slim AS consumer

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY apps/docker-app/package.json ./
COPY --from=package-builder /artifacts/ompdf-0.1.0.tgz ./ompdf.tgz

# Deliberately no apt-get/apk installation: all PDF engines come from npm.
RUN npm install --omit=dev --no-audit --no-fund

COPY apps/docker-app/app.mjs apps/docker-app/verify.mjs ./
COPY apps/docker-app/fixtures ./fixtures

USER node

EXPOSE 3000

CMD ["node", "app.mjs"]
