# poc-pdf-compression monorepo

pnpm + Turbo monorepo for a publishable PDF compression library and a runnable Express API application.

## Workspace layout

```txt
.
├── apps/
│   └── express-api/      # Runnable Express API that consumes ompdf
├── packages/
│   └── ompdf/            # Publishable npm library
├── package.json          # Private workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Packages

### `packages/ompdf`

Publishable npm package named `ompdf`.

Public API:

- `compressPdf(...)`
- `createPdfCompressor(...)`
- `PdfCompressionAlgorithm`
- `PdfCompressionQuality`
- `PdfImageFormat`
- public option/result types

### `apps/express-api`

Express application that exposes the library over HTTP and depends on `ompdf` via `workspace:*`.

Endpoints:

- `GET /health`
- `GET /api/v1/compress/info`
- `POST /api/v1/compress`

## Install

```bash
corepack pnpm install
```

## Common workspace commands

```bash
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter express-api dev
```

## Package-specific commands

Build the library:

```bash
corepack pnpm --filter ompdf build
```

Run the Express app:

```bash
corepack pnpm --filter express-api dev
```

Run library examples:

```bash
corepack pnpm --filter ompdf example:basic -- ./input.pdf ./output-basic.pdf
corepack pnpm --filter ompdf example:commonjs -- ./input.pdf ./output-commonjs.pdf
corepack pnpm --filter ompdf example:smallest -- ./input.pdf ./output-smallest.pdf
corepack pnpm --filter ompdf example:mutool -- ./input.pdf ./output-mutool.pdf
corepack pnpm --filter ompdf example:photon -- ./input.pdf ./output-photon.pdf
```

## Publishing

To publish the library package:

```bash
cd packages/ompdf
corepack pnpm publish
```

To inspect the package tarball locally:

```bash
cd packages/ompdf
corepack pnpm pack
```

## Documentation map

- Root overview: `README.md`
- Library usage: `packages/ompdf/README.md`
- Library examples: `packages/ompdf/examples/README.md`
- API app usage: `apps/express-api/README.md`
- Architecture notes: `ARCHITECTURE.md`

## License

See `packages/ompdf/LICENSE`.
