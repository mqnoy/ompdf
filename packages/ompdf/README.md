# ompdf

PDF compression library for Node.js with multiple strategies:

- `smallest`
- `mutool`
- `ghostscript`
- `standard`
- `condense`
- `photon`

## Install

```bash
npm install ompdf
```

## Quick start

```ts
import {
  compressPdf,
  PdfCompressionAlgorithm,
  PdfCompressionQuality,
} from 'ompdf';

const result = await compressPdf(inputBuffer, {
  filename: 'document.pdf',
  algorithm: PdfCompressionAlgorithm.Standard,
  quality: PdfCompressionQuality.Medium,
});

console.log(result.stats);
```

## CommonJS quick start

Use `require('ompdf')` from CommonJS projects or `.cjs` files:

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

A complete runnable CommonJS CLI example is available at `examples/commonjs-usage.cjs`.

## API

### `compressPdf(input, options)`

Compresses a PDF buffer and returns:

```ts
{
  data: Buffer;
  stats: {
    originalSize: number;
    compressedSize: number;
    reductionPercent: number;
    compressionRatio: string;
    algorithm: PdfCompressionAlgorithm;
    quality?: PdfCompressionQuality;
    pagesProcessed: number;
    processingTimeMs: number;
    outputFilename: string;
  };
}
```

### `createPdfCompressor({ defaults })`

Creates a reusable compressor instance with default options.

## Strategies

### `smallest`
Tries multiple strategies and returns the smallest valid PDF output.

### `mutool`
Uses MuPDF WebAssembly for structure-level optimisation.

### `ghostscript`
Uses Ghostscript WebAssembly `pdfwrite` controls.

### `standard`
Re-encodes embedded images and deflates streams while preserving text and most interactivity.

### `condense`
Structure-only compression that preserves interactivity and text selectability.

### `photon`
Rasterises each page to JPEG/PNG and rebuilds the PDF. Usually the strongest compression for image-heavy files, but text selectability and interactivity are lost.

## Options

### Common

```ts
{
  filename?: string;
  algorithm?: PdfCompressionAlgorithm;
  quality?: PdfCompressionQuality;
  removeMetadata?: boolean;
  optimizeImages?: boolean;
}
```

### Photon options

```ts
{
  photon: {
    dpi?: number;
    format?: PdfImageFormat; // jpeg | png
    quality?: number;
  }
}
```

### Ghostscript options

```ts
{
  ghostscript: {
    preset?: 'screen' | 'ebook' | 'printer' | 'prepress' | 'default';
    compatibilityLevel?: '1.4' | '1.5' | '1.6' | '1.7';
    colorImageResolution?: number;
    grayImageResolution?: number;
    monoImageResolution?: number;
    downsampleImages?: boolean;
  }
}
```

## Usage examples

### Smallest

```ts
await compressPdf(inputBuffer, {
  filename: 'document.pdf',
  algorithm: 'smallest',
  quality: 'medium',
});
```

### MuTool

```ts
await compressPdf(inputBuffer, {
  filename: 'document.pdf',
  algorithm: 'mutool',
  quality: 'maximum',
});
```

### Standard

```ts
await compressPdf(inputBuffer, {
  filename: 'document.pdf',
  algorithm: 'standard',
  quality: 'high',
  removeMetadata: true,
  optimizeImages: false,
});
```

### Condense

```ts
await compressPdf(inputBuffer, {
  filename: 'document.pdf',
  algorithm: 'condense',
  quality: 'low',
  removeMetadata: true,
});
```

### Photon

```ts
await compressPdf(inputBuffer, {
  filename: 'document.pdf',
  algorithm: 'photon',
  photon: {
    dpi: 96,
    format: 'jpeg',
    quality: 60,
  },
});
```

### Ghostscript

```ts
await compressPdf(inputBuffer, {
  filename: 'document.pdf',
  algorithm: 'ghostscript',
  ghostscript: {
    preset: 'ebook',
    compatibilityLevel: '1.4',
  },
});
```

## Runtime notes

- `photon` uses bundled Pyodide + PyMuPDF runtime assets.
- `mutool` uses MuPDF WebAssembly without requiring a system-installed binary.
- `ghostscript` uses Ghostscript WebAssembly controls inside Node.js.
- Photon gives stronger compression for image-heavy PDFs, but it removes searchable/selectable text and interactive features.
- MuPDF has its own licensing considerations; review MuPDF licensing before commercial distribution.

## Development

Build the package:

```bash
corepack pnpm --filter ompdf build
```

Run tests:

```bash
corepack pnpm --filter ompdf test
```

Run examples:

```bash
corepack pnpm --filter ompdf example:basic -- ./input.pdf ./output-basic.pdf
corepack pnpm --filter ompdf example:commonjs -- ./input.pdf ./output-commonjs.pdf
corepack pnpm --filter ompdf example:smallest -- ./input.pdf ./output-smallest.pdf
corepack pnpm --filter ompdf example:mutool -- ./input.pdf ./output-mutool.pdf
corepack pnpm --filter ompdf example:photon -- ./input.pdf ./output-photon.pdf
```

See `examples/README.md` for the complete examples guide, including CommonJS CLI arguments and troubleshooting.
