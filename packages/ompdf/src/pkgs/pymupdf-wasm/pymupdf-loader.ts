/**
 * PyMuPDF Loader (Node.js)
 *
 * Loads PyMuPDF via the `pyodide` npm package and the local .whl files
 * shipped in src/services/pymupdf-wasm/.
 *
 * No pip install required — wheels are loaded directly from disk into
 * Pyodide's WASM sandbox via its virtual filesystem.
 */

import path from 'path';
import { logger } from '../../utils/logger';

// ─── Singleton ────────────────────────────────────────────────────────────────

let pyodideInstance: PyMuPDFInstance | null = null;
let loadingPromise: Promise<PyMuPDFInstance> | null = null;

// ─── Wheel directory ──────────────────────────────────────────────────────────

const WASM_DIR = __dirname;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PhotonCompressOptions {
  dpi?: number;
  format?: 'jpeg' | 'png';
  quality?: number;
}

export interface PhotonCompressResult {
  /** Compressed PDF bytes */
  output: Buffer;
  /** Number of pages rasterised */
  pagesProcessed: number;
}

export interface PyMuPDFInstance {
  photonCompress(input: Buffer, options?: PhotonCompressOptions): Promise<PhotonCompressResult>;
}

/**
 * Initialise Pyodide + PyMuPDF (singleton, lazy).
 * Subsequent calls return the cached instance immediately.
 */
export async function loadPyMuPDF(): Promise<PyMuPDFInstance> {
  if (pyodideInstance) return pyodideInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      logger.info('[PyMuPDF] Initialising Pyodide runtime …');

      // Use the `pyodide` npm package (Node.js compatible)
      const { loadPyodide } = await import('pyodide');

      const pyodide = await loadPyodide({
        // Point at the npm-installed pyodide assets
        // (the npm package bundles its own .wasm / .asm.js)
      });

      // ── Wheel filenames in dependency order ─────────────────────────────────
      const wheels = [
        'numpy-2.2.5-cp313-cp313-pyodide_2025_0_wasm32.whl',
        'typing_extensions-4.12.2-py3-none-any.whl',
        'packaging-24.1-py3-none-any.whl',
        'fonttools-4.56.0-py3-none-any.whl',
        'pymupdf-1.26.3-cp313-none-pyodide_2025_0_wasm32.whl',
      ];

      // Mock non-critical dependencies
      pyodide.runPython(`
import sys
from types import ModuleType

tqdm_mod = ModuleType("tqdm")
def tqdm(iterable=None, *args, **kwargs):
    return iterable if iterable else []
tqdm_mod.tqdm = tqdm
sys.modules["tqdm"] = tqdm_mod

fire_mod = ModuleType("fire")
sys.modules["fire"] = fire_mod
      `);

      // Install wheels via micropip using real filesystem paths
      // (micropip in Node.js reads from the host FS, not the WASM VFS)
      await pyodide.loadPackage('micropip');
      const micropip = pyodide.pyimport('micropip');

      for (const whl of wheels) {
        const realPath = path.join(WASM_DIR, whl);
        await micropip.install(`file://${realPath}`);
        logger.debug(`[PyMuPDF] Installed ${whl}`);
      }

      // Verify pymupdf imports
      await pyodide.runPythonAsync('import pymupdf; print("pymupdf", pymupdf.__version__)');
      logger.info('[PyMuPDF] Runtime ready');

      // ── Build wrapper ─────────────────────────────────────────────────────
      pyodideInstance = {
        /**
         * Photon compression — rasterise each PDF page to a JPEG image at
         * the target DPI, then reassemble into a new slim PDF.
         *
         * This mirrors the original pdfcraft photonCompress logic that uses
         * PyMuPDF's Matrix / get_pixmap / insert_image pipeline.
         */
        async photonCompress(
          input: Buffer,
          options: PhotonCompressOptions = {},
        ): Promise<PhotonCompressResult> {
          const { dpi = 150, quality = 85 } = options;

          const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const inputPath = `/input_photon_${uid}.pdf`;

          pyodide.FS.writeFile(inputPath, new Uint8Array(input));

          const result: string = await pyodide.runPythonAsync(`
import pymupdf, base64, json

doc = pymupdf.open("${inputPath}")
new_doc = pymupdf.open()

target_dpi = ${dpi}
jpeg_quality = ${quality}

for page_num in range(len(doc)):
    page = doc[page_num]
    rect = page.rect

    zoom = target_dpi / 72
    mat = pymupdf.Matrix(zoom, zoom)

    pix = page.get_pixmap(matrix=mat, alpha=False)
    img_bytes = pix.tobytes(output="jpeg", jpg_quality=jpeg_quality)

    new_page = new_doc.new_page(width=rect.width, height=rect.height)
    new_page.insert_image(new_page.rect, stream=img_bytes)

pdf_bytes = new_doc.tobytes(garbage=4, deflate=True)
pages = len(doc)

doc.close()
new_doc.close()

json.dumps({"pages": pages}) + "|||" + base64.b64encode(pdf_bytes).decode("ascii")
          `);

          try { pyodide.FS.unlink(inputPath); } catch { /* ok */ }

          const [metaJson, b64Pdf] = result.split('|||');
          const meta = JSON.parse(metaJson);

          return {
            output: Buffer.from(b64Pdf, 'base64'),
            pagesProcessed: meta.pages,
          };
        },
      } satisfies PyMuPDFInstance;

      return pyodideInstance;
    } catch (error) {
      loadingPromise = null;
      logger.error('[PyMuPDF] Failed to initialise', error);
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Reset singleton (useful for tests).
 */
export function resetPyMuPDF(): void {
  pyodideInstance = null;
  loadingPromise = null;
}
