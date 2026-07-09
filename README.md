# poc-pdf-compression monorepo

pnpm + Turbo monorepo for the publishable `ompdf` PDF-compression library and three runnable consumers: an Express API (including the Telegram webhook bot), a SvelteKit web UI, and an isolated Docker example.

## Requirements

- Node.js 20 or newer
- Corepack with pnpm 10.13.1 (declared in the root `package.json`)
- Docker with Compose v2, only for the isolated Docker example

## Workspace layout

```txt
.
├── apps/
│   ├── express-api/       # HTTP API and integrated Telegram webhook bot
│   ├── webui/             # SvelteKit server-rendered upload UI
│   └── docker-app/        # Isolated packed-package and no-system-tools proof
├── packages/
│   └── ompdf/             # Publishable npm library
├── docs/Home.md           # Documentation landing page
├── ARCHITECTURE.md        # Components, dependencies, and request flows
├── package.json           # Private workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

> There is no separate `apps/telegram-bot` workspace. The Telegram bot is implemented inside `apps/express-api` and is mounted at `/api/v1/telegram/webhook`.

## Components

### `packages/ompdf`

The publishable npm package named `ompdf`. Its public API includes:

- `compressPdf(...)`
- `createPdfCompressor(...)`
- `PdfCompressionAlgorithm`
- `PdfCompressionQuality`
- `PdfImageFormat`
- public compression option, result, statistics, and error types

Supported algorithms are `smallest`, `mutool`, `ghostscript`, `standard`, `condense`, and `photon`. See [`packages/ompdf/README.md`](packages/ompdf/README.md) for options and runtime notes.

### `apps/express-api`

Express 5 application consuming `ompdf` through `workspace:*`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health |
| `GET` | `/api-docs` | Swagger UI |
| `GET` | `/api-docs.json` | OpenAPI JSON |
| `GET` | `/api/v1/compress/info` | Supported algorithm metadata |
| `POST` | `/api/v1/compress` | Multipart PDF compression |
| `POST` | `/api/v1/telegram/webhook` | Telegram webhook bot |

See [`apps/express-api/README.md`](apps/express-api/README.md) for multipart fields, response headers, Telegram setup, and curl examples.

### `apps/webui`

SvelteKit/Svelte 5 server-rendered interface. Its server-only `POST /api/compress` endpoint imports `ompdf` directly; compression code and WASM runtimes are not sent to the browser.

See [`apps/webui/README.md`](apps/webui/README.md).

### `apps/docker-app`

An isolated consumer that packs `ompdf`, installs the tarball in a clean Node image, and verifies selected engines without installing Ghostscript, MuPDF command-line tools, Python, or ImageMagick.

See [`apps/docker-app/README.md`](apps/docker-app/README.md), including the disclosed Photon asset-loading limitation and the `sharp` native-runtime caveat.

## Install

```bash
corepack pnpm install
```

## Common workspace commands

Run these from the repository root:

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
corepack pnpm clean
```

Turbo runs the matching scripts in workspaces. `dev` runs development tasks in parallel.

## Run individual workspaces

```bash
# Express API on PORT (default 3000)
corepack pnpm --filter express-api dev

# Web UI (Vite development server; normally http://localhost:5173)
corepack pnpm --filter webui dev

# Build the library
corepack pnpm --filter ompdf build
```

To preview a production Web UI build:

```bash
corepack pnpm --filter webui build
corepack pnpm --filter webui preview
```

## Environment variables

Copy `.env.example` values into your process environment or deployment secret store as needed.

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | Express API; Docker example process | `3000` | HTTP listen port |
| `NODE_ENV` | Runtime/deployment convention | `development` in `.env.example` | Runtime mode |
| `TELEGRAM_BOT_TOKEN` | Express Telegram integration | none | BotFather token; required for Telegram API calls |
| `TELEGRAM_WEBHOOK_SECRET` | Express Telegram webhook | none | Validates `X-Telegram-Bot-Api-Secret-Token`; webhook returns `503` if unset |
| `TELEGRAM_MAX_FILE_BYTES` | Express Telegram integration | `20971520` (20 MiB) | Maximum accepted Telegram PDF size |
| `OMPDF_PORT` | Docker Compose host mapping | `3000` | Host port mapped to container port 3000 |

Do not commit bot tokens. Revoke and regenerate any token exposed in chat, logs, or issues.

## Docker Compose dependency proof

```bash
docker compose -f apps/docker-app/compose.yaml build --no-cache
docker compose -f apps/docker-app/compose.yaml run --rm verify
```

Run its minimal raw-body HTTP API:

```bash
docker compose -f apps/docker-app/compose.yaml up --build app
curl --fail http://localhost:3000/health
curl --fail --data-binary @apps/docker-app/fixtures/sample.pdf \
  'http://localhost:3000/compress?algorithm=ghostscript' \
  --output /tmp/ompdf-output.pdf
```

If port 3000 is occupied, prefix Compose commands with an alternate mapping such as `OMPDF_PORT=3300` and call `localhost:3300`.

## Library examples

```bash
corepack pnpm --filter ompdf example:basic -- ./input.pdf ./output-basic.pdf
corepack pnpm --filter ompdf example:commonjs -- ./input.pdf ./output-commonjs.pdf
corepack pnpm --filter ompdf example:smallest -- ./input.pdf ./output-smallest.pdf
corepack pnpm --filter ompdf example:mutool -- ./input.pdf ./output-mutool.pdf
corepack pnpm --filter ompdf example:photon -- ./input.pdf ./output-photon.pdf
```

## Publishing

```bash
cd packages/ompdf
corepack pnpm pack       # inspect the tarball locally
corepack pnpm publish    # publish with public access from package metadata
```

## Documentation map

- [Documentation home](docs/Home.md)
- [Architecture](ARCHITECTURE.md)
- [`ompdf` library reference](packages/ompdf/README.md)
- [Library examples](packages/ompdf/examples/README.md)
- [Express API and Telegram webhook](apps/express-api/README.md)
- [SvelteKit Web UI](apps/webui/README.md)
- [Docker isolated consumer](apps/docker-app/README.md)

## License

AGPL-3.0-or-later. See [`packages/ompdf/LICENSE`](packages/ompdf/LICENSE).
