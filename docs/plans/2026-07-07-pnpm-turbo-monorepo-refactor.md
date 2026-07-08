# pnpm + Turbo Monorepo Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor this repository into a pnpm + Turbo monorepo with a publishable `ompdf` library package and a separate `express-api` application that consumes the library as a workspace dependency.

**Architecture:** The current single-package repository mixes library and Express app concerns under `src/`. The refactor will split those concerns into `packages/ompdf` for the publishable compression library and `apps/express-api` for the runnable HTTP app, with shared orchestration handled by pnpm workspaces and Turbo. The library will keep the stable compression API (`compressPdf`, `createPdfCompressor`, public enums/types), while all Express-specific code and docs will move into the app package.

**Tech Stack:** TypeScript, Node.js, pnpm workspaces, Turbo, Express, Multer, Jest, Supertest, pdf-lib, MuPDF WASM, Pyodide, Sharp

---

## Current repo notes

- Current root package: `/home/imza/Developments/poc-pdf-compression/package.json`
- Current library public entrypoint: `/home/imza/Developments/poc-pdf-compression/src/index.ts`
- Current Express exports to remove: `/home/imza/Developments/poc-pdf-compression/src/express.ts`
- Current Express app code to move out of the library:
  - `/home/imza/Developments/poc-pdf-compression/src/app.ts`
  - `/home/imza/Developments/poc-pdf-compression/src/server.ts`
  - `/home/imza/Developments/poc-pdf-compression/src/controllers/compression.controller.ts`
  - `/home/imza/Developments/poc-pdf-compression/src/routes/compression.routes.ts`
  - `/home/imza/Developments/poc-pdf-compression/src/config/swagger.config.ts`
  - `/home/imza/Developments/poc-pdf-compression/src/config/multer.config.ts`
  - `/home/imza/Developments/poc-pdf-compression/src/middleware/errorHandler.ts`
  - `/home/imza/Developments/poc-pdf-compression/src/middleware/validatePDF.ts`
  - `/home/imza/Developments/poc-pdf-compression/src/utils/logger.ts`
- Current root tests include both library and app coverage:
  - `/home/imza/Developments/poc-pdf-compression/test/integration/app.test.ts`
  - `/home/imza/Developments/poc-pdf-compression/test/unit/*.test.ts`
- Current examples:
  - `/home/imza/Developments/poc-pdf-compression/examples/library-usage.ts`
  - `/home/imza/Developments/poc-pdf-compression/examples/express-api-server.ts`
  - `/home/imza/Developments/poc-pdf-compression/examples/curl-api.md`

## Target structure

```txt
.
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── tsconfig.base.json
├── README.md
├── apps/
│   └── express-api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── jest.config.js
│       ├── README.md
│       ├── src/
│       │   ├── app.ts
│       │   └── server.ts
│       └── test/
│           └── express-api.e2e.test.ts
└── packages/
    └── ompdf/
        ├── package.json
        ├── tsconfig.json
        ├── jest.config.js
        ├── README.md
        ├── LICENSE
        ├── src/
        ├── test/
        └── examples/
            ├── README.md
            ├── basic-usage.ts
            ├── smallest-strategy.ts
            ├── mutool-usage.ts
            └── photon-image-heavy.ts
```

---

### Task 1: Create the workspace foundation

**Files:**
- Modify: `/home/imza/Developments/poc-pdf-compression/package.json`
- Create: `/home/imza/Developments/poc-pdf-compression/pnpm-workspace.yaml`
- Create: `/home/imza/Developments/poc-pdf-compression/turbo.json`
- Create: `/home/imza/Developments/poc-pdf-compression/tsconfig.base.json`
- Delete/replace: `/home/imza/Developments/poc-pdf-compression/tsconfig.json`
- Delete after migration: `/home/imza/Developments/poc-pdf-compression/package-lock.json`

**Step 1: Rewrite the root `package.json` as a private workspace root**

Expected shape:

```json
{
  "name": "poc-pdf-compression-workspace",
  "private": true,
  "packageManager": "pnpm@latest",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "...",
    "typescript": "..."
  }
}
```

**Step 2: Add `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Add `turbo.json`**

Include tasks for:
- `build`
- `typecheck`
- `test`
- `dev`
- `clean`

Use dependency-aware task ordering so `express-api` builds after `ompdf`.

**Step 4: Add `tsconfig.base.json`**

Put shared compiler settings here:
- `target: ES2022`
- `module: CommonJS` or the final chosen runtime-compatible setting
- `strict: true`
- `esModuleInterop: true`
- `skipLibCheck: true`
- `resolveJsonModule: true`
- declaration/source map settings for package builds

**Step 5: Remove old single-package assumptions**

- Remove `package-lock.json`
- Stop relying on root `tsconfig.json` as the only compiler config
- Root should no longer build `src/` directly

**Step 6: Install with pnpm**

Run:

```bash
pnpm install
```

Fallback if needed:

```bash
corepack enable
pnpm install
```

Expected: workspace lockfile `pnpm-lock.yaml` is generated and install completes.

**Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json pnpm-lock.yaml
git rm package-lock.json || true
git commit -m "build: initialize pnpm turbo workspace"
```

---

### Task 2: Create the publishable `packages/ompdf` package

**Files:**
- Create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/package.json`
- Create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/tsconfig.json`
- Create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/jest.config.js`
- Create/move: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/src/**`
- Create/move: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/test/**`
- Copy/create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/LICENSE`
- Modify after move: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/src/index.ts`

**Step 1: Create the package manifest**

Required metadata:

```json
{
  "name": "ompdf",
  "version": "0.1.0",
  "description": "PDF compression library with smallest, mutool, standard, condense, and photon strategies",
  "private": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": {
    "access": "public"
  }
}
```

Also include npm-facing metadata if known:
- `license`
- `keywords`
- `repository`
- `bugs`
- `homepage`

**Step 2: Move library-only source files into `packages/ompdf/src`**

Keep these library concerns in the package:
- `pdf-compressor.ts`
- `engines/**`
- `services/compression.service.ts`
- `types/public.types.ts`
- `types/compression.types.ts`
- `types/ghostscript-wasm.d.ts`
- `utils/filename.util.ts`
- `pkgs/pymupdf-wasm/**`
- any pure compression helpers needed by the package

**Step 3: Keep the public API library-first**

Final public imports must work like this:

```ts
import {
  compressPdf,
  createPdfCompressor,
  PdfCompressionAlgorithm,
  PdfCompressionQuality,
} from 'ompdf';
```

Do **not** export any Express API from `ompdf`.

**Step 4: Remove old Express subpath exports**

Delete old export patterns such as:

```json
"./express": {
  "types": "./dist/express.d.ts",
  "require": "./dist/express.js"
}
```

And remove usage/documentation like:

```ts
import { createPdfCompressionApp } from 'ompdf/express';
```

**Step 5: Add package-local scripts**

Add scripts for:
- `build`
- `typecheck`
- `test`
- `clean`
- example runner scripts if desired, e.g. `example:basic`

**Step 6: Add package compiler config**

`packages/ompdf/tsconfig.json` should extend the root base config and compile `src/**` into `dist/`.

**Step 7: Add package Jest config**

Scope tests to `packages/ompdf/test/**/*.test.ts` and collect coverage from `packages/ompdf/src/**/*.ts` while excluding generated/runtime asset areas if needed.

**Step 8: Commit**

```bash
git add packages/ompdf
git commit -m "feat: create publishable ompdf package"
```

---

### Task 3: Move the Express app into `apps/express-api`

**Files:**
- Create: `/home/imza/Developments/poc-pdf-compression/apps/express-api/package.json`
- Create: `/home/imza/Developments/poc-pdf-compression/apps/express-api/tsconfig.json`
- Create: `/home/imza/Developments/poc-pdf-compression/apps/express-api/jest.config.js`
- Create/move: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/app.ts`
- Create/move: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/server.ts`
- Create/move: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/controllers/compression.controller.ts`
- Create/move: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/routes/compression.routes.ts`
- Create/move: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/config/multer.config.ts`
- Create/move: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/config/swagger.config.ts`
- Create/move: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/middleware/errorHandler.ts`
- Create/move: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/middleware/validatePDF.ts`
- Create/move or replace: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/utils/logger.ts`

**Step 1: Create the app package manifest**

Required shape:

```json
{
  "name": "express-api",
  "private": true,
  "dependencies": {
    "ompdf": "workspace:*",
    "express": "...",
    "multer": "..."
  }
}
```

Keep Express-only runtime dependencies here:
- `express`
- `multer`
- `swagger-jsdoc`
- `swagger-ui-express`
- any Express-specific types/dev tools

**Step 2: Move app code into the app package**

`apps/express-api/src/app.ts` should own:
- body parsing
- request logging
- Swagger UI
- `/health`
- `/api/v1/compress`
- 404 handling
- global error handling

**Step 3: Rename the app factory to an app-specific name**

Prefer a name that does not imply library export, for example:

```ts
export function createExpressApiApp(): Application {
  // ...
}
```

This makes E2E tests and app ownership clearer.

**Step 4: Update the app server entrypoint**

`apps/express-api/src/server.ts` should start the server on `PORT` and log the app endpoints.

**Step 5: Make the app depend only on public `ompdf` exports**

Allowed import style:

```ts
import { compressPdf } from 'ompdf';
```

Do **not** import from:
- `packages/ompdf/src/...`
- relative cross-package source paths
- internal library types that are not part of `ompdf` public exports

**Step 6: Add app-local scripts**

Add scripts for:
- `dev`
- `build`
- `typecheck`
- `test`
- `clean`

**Step 7: Commit**

```bash
git add apps/express-api
git commit -m "feat: create express-api workspace app"
```

---

### Task 4: Remove the old Express library API completely

**Files:**
- Delete: `/home/imza/Developments/poc-pdf-compression/src/express.ts`
- Delete: `/home/imza/Developments/poc-pdf-compression/src/app.ts`
- Delete: `/home/imza/Developments/poc-pdf-compression/src/server.ts`
- Delete: `/home/imza/Developments/poc-pdf-compression/src/controllers/compression.controller.ts`
- Delete: `/home/imza/Developments/poc-pdf-compression/src/routes/compression.routes.ts`
- Delete: `/home/imza/Developments/poc-pdf-compression/src/config/swagger.config.ts`
- Delete/move: `/home/imza/Developments/poc-pdf-compression/src/config/multer.config.ts`
- Delete/move: `/home/imza/Developments/poc-pdf-compression/src/middleware/errorHandler.ts`
- Delete/move: `/home/imza/Developments/poc-pdf-compression/src/middleware/validatePDF.ts`
- Modify: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/src/index.ts`
- Modify: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/package.json`

**Step 1: Delete all library-facing Express exports**

These must not remain in the final package API:
- `createPdfCompressionApp`
- `pdfCompressionRouter`
- any `./express` export path
- any `./server` export path

**Step 2: Verify the final `packages/ompdf/src/index.ts` exports only library API**

Keep exports like:

```ts
export { compressPdf, createPdfCompressor } from './pdf-compressor';
export {
  PdfCompressionAlgorithm,
  PdfCompressionQuality,
  PdfImageFormat,
} from './types/public.types';
```

**Step 3: Search for old API references and remove them**

Search for:
- `createPdfCompressionApp`
- `poc-pdf-compression/express`
- `./express`
- `src/server`

Expected: no remaining public docs/tests/examples reference the old API.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove express exports from library package"
```

---

### Task 5: Rebuild and validate the app HTTP behavior in the new package layout

**Files:**
- Modify: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/controllers/compression.controller.ts`
- Modify: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/routes/compression.routes.ts`
- Modify: `/home/imza/Developments/poc-pdf-compression/apps/express-api/src/app.ts`
- Test: `/home/imza/Developments/poc-pdf-compression/apps/express-api/test/express-api.e2e.test.ts`

**Step 1: Keep the app endpoints minimal and explicit**

Required endpoints:

```http
GET /health
POST /api/v1/compress
```

If `/api/v1/compress/info` is intentionally kept, document it explicitly. If it is removed, update old tests/docs accordingly.

**Step 2: Accept the required multipart fields**

Required supported inputs:
- `file` (required PDF)
- `algorithm` (optional)
- `strategy` (optional alias for `algorithm`)
- `quality` (optional)
- `removeMetadata` (optional boolean-ish string)
- `optimizeImages` (optional boolean-ish string)
- `photonDpi` (optional number)
- `photonFormat` (`jpeg` or `png`)
- `photonQuality` (optional number)

Defaults:
- `algorithm=smallest`
- `quality=medium`

**Step 3: Ensure the controller calls only the public library API**

Expected call shape:

```ts
const result = await compressPdf(req.file.buffer, options);
```

**Step 4: Set the response headers**

Successful PDF responses must include:
- `Content-Type: application/pdf`
- `Content-Disposition`
- `X-Compression-Algorithm`
- `X-Original-Size`
- `X-Compressed-Size`
- `X-Compression-Ratio`
- `X-Pages-Processed`

**Step 5: Keep validation explicit and testable**

Validate at minimum:
- missing file
- invalid algorithm
- invalid quality
- invalid photon values
- invalid ghostscript values if still supported by the library API

**Step 6: Commit**

```bash
git add apps/express-api/src apps/express-api/test
git commit -m "feat: wire express-api to ompdf public API"
```

---

### Task 6: Split and migrate the test suite

**Files:**
- Create/move: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/test/**`
- Create: `/home/imza/Developments/poc-pdf-compression/apps/express-api/test/express-api.e2e.test.ts`
- Delete/replace: `/home/imza/Developments/poc-pdf-compression/test/integration/app.test.ts`
- Delete/replace: `/home/imza/Developments/poc-pdf-compression/test/unit/*.test.ts`
- Delete/replace: `/home/imza/Developments/poc-pdf-compression/jest.config.js`

**Step 1: Keep library tests in `packages/ompdf/test`**

Preserve or move coverage for:
- compression service
- engines
- public API
- smallest strategy
- mutool strategy
- filename/util behavior
- PyMuPDF loader logic

**Step 2: Create app E2E tests in `apps/express-api/test/express-api.e2e.test.ts`**

Use Supertest against the app factory:

```ts
import request from 'supertest';
import { createExpressApiApp } from '../src/app';
```

**Step 3: Cover the required app scenarios**

Required E2E cases:
- `GET /health`
- missing file validation
- invalid algorithm validation
- `standard` with custom params
- `condense` with custom params
- `mutool` with custom params
- `photon` with custom params
- `smallest`
- `strategy` alias

**Step 4: Validate successful E2E responses deeply**

For each successful compression test, assert:
- HTTP 200
- response starts with `%PDF-`
- output parses with `pdf-lib`
- page count is preserved
- compression headers exist

**Step 5: Run package-scoped tests**

Run:

```bash
pnpm --filter ompdf test
pnpm --filter express-api test
```

Expected: both pass independently.

**Step 6: Run full workspace tests**

```bash
pnpm test
```

Expected: Turbo runs both test suites successfully.

**Step 7: Commit**

```bash
git add packages/ompdf/test apps/express-api/test
git commit -m "test: split library and express-api test suites"
```

---

### Task 7: Add direct-use library examples under `packages/ompdf/examples`

**Files:**
- Create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/examples/README.md`
- Create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/examples/basic-usage.ts`
- Create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/examples/smallest-strategy.ts`
- Create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/examples/mutool-usage.ts`
- Create: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/examples/photon-image-heavy.ts`
- Delete/replace: `/home/imza/Developments/poc-pdf-compression/examples/library-usage.ts`
- Delete/replace: `/home/imza/Developments/poc-pdf-compression/examples/express-api-server.ts`
- Delete/replace: `/home/imza/Developments/poc-pdf-compression/examples/curl-api.md`

**Step 1: Add direct library examples only**

Examples should demonstrate importing from `ompdf`, not Express.

**Step 2: Include at least these examples**

- `basic-usage.ts`
- `smallest-strategy.ts`
- `mutool-usage.ts`
- `photon-image-heavy.ts`

**Step 3: Make examples runnable**

Either add scripts like:

```json
{
  "scripts": {
    "example:basic": "tsx examples/basic-usage.ts",
    "example:smallest": "tsx examples/smallest-strategy.ts",
    "example:mutool": "tsx examples/mutool-usage.ts",
    "example:photon": "tsx examples/photon-image-heavy.ts"
  }
}
```

Or document the direct `tsx` commands in `examples/README.md`.

**Step 4: Verify example imports**

All examples must use:

```ts
import { compressPdf } from 'ompdf';
```

or the package-local equivalent that still reflects real consumer usage.

**Step 5: Commit**

```bash
git add packages/ompdf/examples
git commit -m "docs: add direct-use ompdf examples"
```

---

### Task 8: Update all documentation after the refactor is complete

**Files:**
- Modify: `/home/imza/Developments/poc-pdf-compression/README.md`
- Create/modify: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/README.md`
- Create/modify: `/home/imza/Developments/poc-pdf-compression/packages/ompdf/examples/README.md`
- Create/modify: `/home/imza/Developments/poc-pdf-compression/apps/express-api/README.md`
- Modify if still relevant: `/home/imza/Developments/poc-pdf-compression/ARCHITECTURE.md`
- Remove/update any stale docs under `/home/imza/Developments/poc-pdf-compression/docs/**` that mention the old layout or API

**Step 1: Rewrite the root README as a monorepo overview**

Document:
- workspace layout
- what lives in `packages/ompdf`
- what lives in `apps/express-api`
- install command:

```bash
pnpm install
```

- common commands:

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm --filter express-api dev
```

- publish flow:

```bash
cd packages/ompdf
pnpm publish
```

**Step 2: Write `packages/ompdf/README.md` for npm consumers**

Must include:
- install:

```bash
npm install ompdf
```

- import:

```ts
import { compressPdf } from 'ompdf';
```

- examples for every strategy:
  - `smallest`
  - `mutool`
  - `standard`
  - `condense`
  - `photon`
- custom options:
  - `quality`
  - `removeMetadata`
  - `optimizeImages`
  - `photonDpi`
  - `photonFormat`
  - `photonQuality`
- notes about:
  - photon rasterization tradeoffs
  - text/selectability tradeoff
  - MuPDF WASM usage without system binaries
  - MuPDF licensing consideration
  - publish/build details

**Step 3: Write `packages/ompdf/examples/README.md`**

Document how to run examples:

```bash
pnpm --filter ompdf example:basic
pnpm --filter ompdf example:smallest
pnpm --filter ompdf example:mutool
pnpm --filter ompdf example:photon
```

If scripts differ, document the exact `tsx` commands instead.

**Step 4: Write `apps/express-api/README.md`**

Document:
- app purpose
- app consumes `ompdf` as a dependency
- run command:

```bash
pnpm --filter express-api dev
```

- endpoints:

```http
GET /health
POST /api/v1/compress
```

- multipart parameters
- curl examples for:
  - `algorithm=smallest`
  - `algorithm=mutool&quality=maximum`
  - `algorithm=standard&quality=high&removeMetadata=true&optimizeImages=false`
  - `algorithm=condense&quality=low&removeMetadata=true`
  - `algorithm=photon&photonDpi=96&photonFormat=jpeg&photonQuality=60`
  - `strategy=mutool` alias
- response headers
- large-PDF note:
  - `smallest` skips expensive photon for huge page-count PDFs
  - prior observed output: `21,005,621` bytes → `8,911,327` bytes via `mutool`
  - approx. `57.58%` smaller

**Step 5: Remove outdated docs**

Search for and remove or rewrite mentions of:
- `poc-pdf-compression/express`
- `createPdfCompressionApp`
- Express as a library export
- old root-only project layout
- outdated package name if it conflicts with `ompdf`

**Step 6: Commit**

```bash
git add README.md packages/ompdf/README.md packages/ompdf/examples/README.md apps/express-api/README.md ARCHITECTURE.md docs
 git commit -m "docs: update monorepo and package documentation"
```

---

### Task 9: Final workspace validation and release readiness check

**Files:**
- Validate workspace files and package manifests
- Validate generated outputs only if needed for release packaging

**Step 1: Run full workspace validation**

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

Expected: all workspace packages install, build, typecheck, and test successfully.

**Step 2: Run the app manually**

```bash
pnpm --filter express-api dev
```

In another shell:

```bash
curl -F "file=@tmp/e2e-examplefile/source.pdf" \
     -F "algorithm=smallest" \
     -o tmp/e2e-examplefile/app-smallest.pdf \
     http://localhost:3000/api/v1/compress
```

Expected for the 20 MB / 6154-page file:
- `smallest` skips expensive photon due to the huge page guard
- `mutool` wins for output size
- prior observed result: `8,911,327` bytes from `21,005,621` bytes
- approx. `57.58%` smaller

**Step 3: Smoke-test package publishing shape**

From `packages/ompdf` run:

```bash
pnpm pack
```

Expected tarball contents include:
- `dist/**`
- `README.md`
- `LICENSE`

Expected tarball contents do **not** include:
- Express app code
- workspace-only files
- internal dev-only artifacts not intended for consumers

**Step 4: Verify final outcomes**

Confirm all of the following are true:
- monorepo uses pnpm + Turbo
- main app lives in `apps/express-api`
- publishable npm library lives in `packages/ompdf`
- library package name is `ompdf`
- library contains direct-use examples
- Express app consumes `ompdf` as a workspace dependency
- no `createPdfCompressionApp` API remains
- documentation reflects the final structure and usage

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: finish monorepo refactor validation"
```

---

## Notes and guardrails

- Keep the library package free of Express runtime dependencies.
- The `express-api` app must use only published/public `ompdf` exports.
- Prefer moving code with minimal behavioral change first, then refactor names/structure once tests are green.
- Update docs only after code and tests reflect the final architecture.
- If `pnpm` is unavailable, try `corepack`; if that also fails, stop and report the blocker clearly instead of partially migrating package management.

## Suggested implementation order

1. Workspace foundation
2. `packages/ompdf`
3. `apps/express-api`
4. Remove old Express exports
5. Split tests
6. Add examples
7. Rewrite docs
8. Final validation

Plan complete and saved to `docs/plans/2026-07-07-pnpm-turbo-monorepo-refactor.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open a new session with executing-plans, batch execution with checkpoints

**Which approach?**
