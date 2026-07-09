---
title: Home Dashboard
date: 2026-07-09
tags:
  - dashboard
  - setup
  - ompdf
---

# 🚀 poc-pdf-compression

Internal documentation landing page for the `ompdf` PDF compression workspace.

## 📚 Core documents

- [[README]] — Repository overview, install steps, workspace commands, environment variables, and documentation map.
- [[ARCHITECTURE]] — Component boundaries, dependency graph, compression flows, runtime assets, and testing split.
- [[packages/ompdf/README]] — Publishable library API, compression algorithms, options, examples, and package development.
- [[packages/ompdf/examples/README]] — Runnable TypeScript and CommonJS examples.
- [[apps/express-api/README]] — Express endpoints, multipart parameters, response headers, Swagger, and Telegram webhook bot setup.
- [[apps/webui/README]] — SvelteKit Web UI usage, local development, and server endpoint behavior.
- [[apps/docker-app/README]] — Docker Compose isolated consumer, dependency proof, raw-body API, and runtime caveats.

## 🧭 Component map

| Component | Path | Role |
| --- | --- | --- |
| Library | `packages/ompdf` | Publishable Node.js package exposing `compressPdf` and related types. |
| Express API | `apps/express-api` | HTTP wrapper around `ompdf`, Swagger UI, and Telegram webhook integration. |
| Telegram bot | `apps/express-api/src/**/telegram*` | Integrated Express webhook at `/api/v1/telegram/webhook`; no separate app package. |
| Web UI | `apps/webui` | SvelteKit/Svelte 5 upload interface with server-side `/api/compress`. |
| Docker proof | `apps/docker-app` | Packed-package consumer verifying selected engines without system PDF tools. |

## ⚡ Quick start

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm test
```

Run individual apps:

```bash
corepack pnpm --filter express-api dev
corepack pnpm --filter webui dev
docker compose -f apps/docker-app/compose.yaml up --build app
```

## 🔌 Main endpoints

### Express API (`apps/express-api`, default `PORT=3000`)

- `GET /health`
- `GET /api-docs`
- `GET /api-docs.json`
- `GET /api/v1/compress/info`
- `POST /api/v1/compress`
- `POST /api/v1/telegram/webhook`

### Web UI (`apps/webui`)

- `GET /` — upload UI
- `POST /api/compress` — server-side multipart compression endpoint

### Docker example (`apps/docker-app`)

- `GET /health`
- `POST /compress?algorithm=standard|condense|mutool|ghostscript|photon`

## 🔐 Environment variables

- `PORT` — Express API and Docker example listen port, default `3000`.
- `NODE_ENV` — runtime mode convention.
- `TELEGRAM_BOT_TOKEN` — BotFather token for Telegram API calls.
- `TELEGRAM_WEBHOOK_SECRET` — validates `X-Telegram-Bot-Api-Secret-Token` on the webhook.
- `TELEGRAM_MAX_FILE_BYTES` — optional Telegram PDF size limit, default `20971520`.
- `OMPDF_PORT` — Docker Compose host port mapping, default `3000`.

Never commit Telegram tokens. Revoke any token that appears in chat, logs, or issues.

## 📂 Vault structure

- **[[00 Inbox/]]** — Quick ideas and unorganized notes.
- **[[10 Projects/]]** — Active components and features.
- **[[20 Areas/]]** — Ongoing responsibilities such as CI/CD, testing, and infrastructure.
- **[[30 Resources/]]** — Useful links, articles, and learning materials.
- **[[40 Archive/]]** — Completed and deprecated notes.

## ✅ Documentation maintenance checklist

When code or manifests change, update:

1. Root `README.md` for workspace-level commands, environment, and documentation map.
2. `ARCHITECTURE.md` for component boundaries and flow changes.
3. App/package README files for local commands, endpoints, and runtime caveats.
4. `.env.example` if new runtime configuration is introduced.
