# Docker Compose: no system PDF tools

This isolated consumer builds `ompdf`, packs it, installs the tarball in a fresh official Node image, and uses only the package's public API. The Dockerfile deliberately does not install Ghostscript, MuPDF tools, Python, ImageMagick, or other OS packages.

## Verify the package

From the repository root:

```bash
docker compose -f apps/docker-app/compose.yaml build --no-cache
docker compose -f apps/docker-app/compose.yaml run --rm verify
```

The verification container:

- confirms `gs`, `mutool`, `python`, `python3`, and `convert` are absent from `PATH`;
- blocks Node child-process APIs so an engine cannot silently shell out;
- invokes `standard`, `condense`, `mutool`, and `ghostscript` directly;
- validates the PDF output and reported statistics for every engine.

`smallest` is intentionally not used as the proof: it can tolerate a failed candidate when another engine succeeds.

Photon is not part of this passing proof yet. Its current packaged Pyodide runtime fails to load `micropip` in the isolated consumer, so the example does not claim that backend is verified. The HTTP endpoint exposes Photon for development, but requests will report that runtime error until its asset-loading issue is fixed.

## Run the example API

```bash
docker compose -f apps/docker-app/compose.yaml up --build app
```

Port `3000` is used by default. If it is already occupied, set another host port, for example `OMPDF_PORT=3300`.

Health check:

```bash
curl --fail http://localhost:3000/health
```

Compress the included fixture using Ghostscript WASM:

```bash
curl --fail --data-binary @apps/docker-app/fixtures/sample.pdf \
  'http://localhost:3000/compress?algorithm=ghostscript' \
  --output /tmp/ompdf-output.pdf
```

Supported algorithms are `standard`, `condense`, `mutool`, `ghostscript`, and `photon`.

Stop the service:

```bash
docker compose -f apps/docker-app/compose.yaml down
```

## What this proves

The verified Ghostscript and MuPDF functionality is delivered through npm/WASM rather than system commands. Photon is designed to run Python and PyMuPDF within Pyodide/WASM, but its current isolated-package loader issue is disclosed above. No separately installed command-line PDF tool is required by the four verified engines.

This is not a claim that every dependency is pure JavaScript. `sharp` uses an npm-provided platform-specific native addon and bundled libvips runtime. Consequently, the image architecture and libc must be supported by Sharp's prebuilt npm packages. Building the image also requires npm registry access.
