# webui

SvelteKit/Svelte 5 server-rendered web interface for compressing PDFs with the workspace `ompdf` package.

The UI renders a local upload form and posts to a server-only endpoint. Compression and package runtime assets stay on the Node.js server; the browser receives only the compressed PDF and response metadata.

## Run locally

From the workspace root:

```bash
corepack pnpm install
corepack pnpm --filter webui dev
```

Vite prints the development URL, normally `http://localhost:5173`.

## Production build and preview

```bash
corepack pnpm --filter webui build
corepack pnpm --filter webui preview
```

The app uses `@sveltejs/adapter-node`, so the production build is emitted under `apps/webui/build`.

## Scripts

Defined in `apps/webui/package.json`:

```bash
corepack pnpm --filter webui dev
corepack pnpm --filter webui build
corepack pnpm --filter webui preview
corepack pnpm --filter webui typecheck
corepack pnpm --filter webui test
corepack pnpm --filter webui clean
```

## Routes

| Method | Route | Source | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | `src/routes/+page.svelte` | Upload form and enhanced result display |
| `POST` | `/api/compress` | `src/routes/api/compress/+server.ts` | Server-side multipart compression endpoint |

## Multipart fields

### Required

- `file` — uploaded PDF whose filename ends in `.pdf` and whose media type is `application/pdf` or empty

### Optional

- `algorithm` — `standard | condense | mutool | ghostscript | smallest | photon`
- `quality` — `low | medium | high | maximum`
- `removeMetadata` — checkbox/boolean
- `optimizeImages` — checkbox/boolean
- `photonDpi` — number between `36` and `600`
- `photonFormat` — `jpeg | png`
- `photonQuality` — number between `1` and `100`
- `ghostscriptPreset` — `screen | ebook | printer | prepress | default`
- `ghostscriptCompatibilityLevel` — `1.4 | 1.5 | 1.6 | 1.7`
- `ghostscriptColorImageResolution` — number
- `ghostscriptGrayImageResolution` — number
- `ghostscriptMonoImageResolution` — number
- `ghostscriptDownsampleImages` — checkbox/boolean

The server endpoint builds an `ompdf` `PdfCompressionOptions` object and calls `compressPdf` after dynamically importing the package.

## Example request

```bash
curl -F "file=@./input.pdf" \
     -F "algorithm=ghostscript" \
     -F "quality=medium" \
     -o ./output-webui.pdf \
     http://localhost:5173/api/compress
```

## Response headers

Successful responses return `Content-Type: application/pdf` plus:

- `Content-Disposition`
- `X-Compression-Algorithm`
- `X-Original-Size`
- `X-Compressed-Size`
- `X-Compression-Ratio`
- `X-Pages-Processed`
- `X-Processing-Time-Ms`

Validation failures return JSON with `success: false` and an `error` object.

## Notes

- This workspace depends on `ompdf` via `workspace:*`.
- There are no Web UI-specific environment variables in the current source.
- The default form selection starts with `photon`; use another algorithm if text selectability or interactive PDF features must be preserved.
