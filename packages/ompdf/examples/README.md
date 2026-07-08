# ompdf examples

Runnable examples for using the `ompdf` PDF compression library directly from Node.js.

The examples cover both TypeScript/ES module-style usage and plain JavaScript CommonJS usage with `require(...)`.

## Prerequisites

- Node.js 20 or newer is recommended.
- Install workspace dependencies from the repository root:

```bash
corepack pnpm install
```

- Build the library before running the CommonJS example, because it loads the package through the compiled `dist` entrypoint:

```bash
corepack pnpm --filter ompdf build
```

## Run examples

Run these commands from the workspace root.

```bash
corepack pnpm --filter ompdf example:basic -- ./input.pdf ./output-basic.pdf
corepack pnpm --filter ompdf example:commonjs -- ./input.pdf ./output-commonjs.pdf
corepack pnpm --filter ompdf example:smallest -- ./input.pdf ./output-smallest.pdf
corepack pnpm --filter ompdf example:mutool -- ./input.pdf ./output-mutool.pdf
corepack pnpm --filter ompdf example:photon -- ./input.pdf ./output-photon.pdf
```

You can also run the CommonJS example directly from this package directory after building:

```bash
node examples/commonjs-usage.cjs ./input.pdf ./output-commonjs.pdf
```

## Included examples

| File | Runtime style | What it demonstrates |
| --- | --- | --- |
| `basic-usage.ts` | TypeScript | Standard compression with balanced defaults. |
| `commonjs-usage.cjs` | JavaScript CommonJS | `require('ompdf')`, CLI argument parsing, robust error handling, and formatted output stats. |
| `smallest-strategy.ts` | TypeScript | Trying multiple strategies and returning the smallest valid output. |
| `mutool-usage.ts` | TypeScript | MuPDF WebAssembly structure optimization directly. |
| `photon-image-heavy.ts` | TypeScript | Aggressive image-heavy compression through page rasterization. |

## CommonJS JavaScript usage

Use this pattern when your Node.js application is configured for CommonJS or uses `.cjs` files.

```js
const { promises: fs } = require('node:fs');
const {
  compressPdf,
  PdfCompressionAlgorithm,
  PdfCompressionQuality,
} = require('ompdf');

async function run() {
  const input = await fs.readFile('./document.pdf');
  const result = await compressPdf(input, {
    filename: 'document.pdf',
    algorithm: PdfCompressionAlgorithm.Standard,
    quality: PdfCompressionQuality.Medium,
    removeMetadata: true,
    optimizeImages: true,
  });

  await fs.writeFile('./document.compressed.pdf', result.data);
  console.log(result.stats);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

## CommonJS CLI arguments

`commonjs-usage.cjs` accepts:

```txt
node examples/commonjs-usage.cjs <input.pdf> [output.pdf] [algorithm] [quality]
```

| Argument | Required | Default | Values |
| --- | --- | --- | --- |
| `input.pdf` | Yes | - | Path to the source PDF. |
| `output.pdf` | No | `<input-name>.compressed.pdf` | Path for the compressed PDF. |
| `algorithm` | No | `standard` | `standard`, `condense`, `mutool`, `ghostscript`, `smallest`, `photon` |
| `quality` | No | `medium` | `low`, `medium`, `high`, `maximum` |

Examples:

```bash
corepack pnpm --filter ompdf example:commonjs -- ./document.pdf
corepack pnpm --filter ompdf example:commonjs -- ./document.pdf ./document-compressed.pdf
corepack pnpm --filter ompdf example:commonjs -- ./document.pdf ./document-smallest.pdf smallest high
```

## Strategy notes

- `standard` is a balanced default for general-purpose PDFs.
- `smallest` tries available strategies and returns the smallest valid result.
- `mutool` focuses on PDF structure optimization.
- `ghostscript` uses Ghostscript WebAssembly controls in Node.js.
- `photon` can compress image-heavy PDFs aggressively, but it rasterizes pages and removes searchable/selectable text and interactive PDF features.

## Troubleshooting

### `Cannot find module 'ompdf'`

Run examples through pnpm from the workspace root, or run them from inside `packages/ompdf` after dependencies are installed.

```bash
corepack pnpm install
corepack pnpm --filter ompdf build
corepack pnpm --filter ompdf example:commonjs -- ./input.pdf ./output.pdf
```

### Output PDF is larger than input

Some PDFs are already optimized. Try another strategy, for example:

```bash
corepack pnpm --filter ompdf example:commonjs -- ./input.pdf ./output-smallest.pdf smallest medium
```

### Need text selectability preserved

Avoid `photon`; use `standard`, `mutool`, `ghostscript`, or `smallest` depending on your requirements.
