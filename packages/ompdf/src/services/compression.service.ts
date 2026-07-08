/**
 * PDF Compression Service
 *
 * Orchestrates the compression algorithms, mirrors the routing
 * logic in CompressPDFProcessor.process() from pdfcraft:
 *
 *   switch (algorithm) {
 *     case 'condense': compressWithCondense(...)
 *     case 'photon':   compressWithPhoton(...)
 *     case 'standard': compressWithWorker(...) [+ optimizeImagesWithPyMuPDF]
 *     case 'mutool':   compressWithMuPdfWasm(...)
 *     case 'smallest': try all strategies and return the smallest valid output
 *   }
 */

import { PDFDocument } from 'pdf-lib';
import {
  CompressionAlgorithm,
  CompressionQuality,
  ImageFormat,
  type CompressRequestBody,
  type CompressionResult,
} from '../types/compression.types';
import { runPhotonCompression } from '../engines/photon.engine';
import { runStandardCompression } from '../engines/standard.engine';
import { runCondenseCompression } from '../engines/condense.engine';
import { runMutoolCompression } from '../engines/mutool.engine';
import { runGhostscriptCompression } from '../engines/ghostscript.engine';
import { logger } from '../utils/logger';
import { generateCompressedFilename } from '../utils/filename.util';

type NormalizedCompressOptions = Required<
  Pick<
    CompressRequestBody,
    | 'algorithm'
    | 'quality'
    | 'removeMetadata'
    | 'optimizeImages'
    | 'photonDpi'
    | 'photonFormat'
    | 'photonQuality'
  >
> & Omit<
  CompressRequestBody,
  | 'algorithm'
  | 'quality'
  | 'removeMetadata'
  | 'optimizeImages'
  | 'photonDpi'
  | 'photonFormat'
  | 'photonQuality'
>;

const DEFAULT_OPTIONS: NormalizedCompressOptions = {
  algorithm: CompressionAlgorithm.PHOTON,
  quality: CompressionQuality.MEDIUM,
  removeMetadata: false,
  optimizeImages: true,
  photonDpi: 150,
  photonFormat: ImageFormat.JPEG,
  photonQuality: 85,
  ghostscriptCompatibilityLevel: '1.4',
};

const SMALLEST_CANDIDATES = [
  CompressionAlgorithm.STANDARD,
  CompressionAlgorithm.CONDENSE,
  CompressionAlgorithm.MUTOOL,
  CompressionAlgorithm.GHOSTSCRIPT,
  CompressionAlgorithm.PHOTON,
] as const;

const DEFAULT_SMALLEST_MAX_PHOTON_PAGES = 500;

function getSmallestMaxPhotonPages(): number {
  const value = Number.parseInt(process.env.SMALLEST_MAX_PHOTON_PAGES ?? '', 10);
  return Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_SMALLEST_MAX_PHOTON_PAGES;
}

type CompressionEngineOutput = {
  output: Buffer;
  pagesProcessed: number;
};

type SelectedCompressionOutput = CompressionEngineOutput & {
  algorithm: CompressionAlgorithm;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class CompressionService {
  /**
   * Compress a PDF buffer using the requested algorithm.
   *
   * @param inputBuffer     Raw PDF bytes
   * @param originalName    Original filename, used to generate output filename
   * @param options         Partial compress options (merged with defaults)
   * @returns               Compression result with metadata
   */
  async compress(
    inputBuffer: Buffer,
    originalName: string,
    options: Partial<CompressRequestBody>
  ): Promise<{ buffer: Buffer; result: CompressionResult }> {
    const opts: NormalizedCompressOptions = { ...DEFAULT_OPTIONS, ...options };
    const originalSize = inputBuffer.byteLength;
    const startTime = Date.now();

    logger.info(`[CompressionService] algorithm=${opts.algorithm} originalSize=${originalSize}`);

    const selected = opts.algorithm === CompressionAlgorithm.SMALLEST
      ? await this.compressWithSmallest(inputBuffer, opts)
      : {
          ...(await this.runSingleStrategy(opts.algorithm, inputBuffer, opts)),
          algorithm: opts.algorithm,
        };

    const compressedSize = selected.output.byteLength;
    const ratio = originalSize
      ? ((originalSize - compressedSize) / originalSize) * 100
      : 0;
    const processingTimeMs = Date.now() - startTime;
    const outputFilename = generateCompressedFilename(originalName, selected.algorithm);

    const result: CompressionResult = {
      originalSize,
      compressedSize,
      compressionRatio: `${ratio.toFixed(2)}%`,
      algorithm: selected.algorithm,
      quality: opts.quality,
      pagesProcessed: selected.pagesProcessed,
      processingTimeMs,
      outputFilename,
    };

    logger.info(
      `[CompressionService] done ratio=${result.compressionRatio} ` +
        `(${originalSize} → ${compressedSize} bytes) time=${processingTimeMs}ms` +
        (opts.algorithm === CompressionAlgorithm.SMALLEST
          ? ` selected=${selected.algorithm}`
          : '')
    );

    return { buffer: selected.output, result };
  }

  private async runSingleStrategy(
    algorithm: CompressionAlgorithm,
    inputBuffer: Buffer,
    opts: NormalizedCompressOptions
  ): Promise<CompressionEngineOutput> {
    switch (algorithm) {
      case CompressionAlgorithm.PHOTON:
        return runPhotonCompression(inputBuffer, {
          photonDpi: opts.photonDpi,
          photonFormat: opts.photonFormat,
          photonQuality: opts.photonQuality,
        });

      case CompressionAlgorithm.STANDARD:
        return runStandardCompression(inputBuffer, {
          quality: opts.quality,
          removeMetadata: opts.removeMetadata,
          optimizeImages: opts.optimizeImages,
        });

      case CompressionAlgorithm.CONDENSE:
        return runCondenseCompression(inputBuffer, {
          quality: opts.quality,
          removeMetadata: opts.removeMetadata,
        });

      case CompressionAlgorithm.MUTOOL:
        return runMutoolCompression(inputBuffer, {
          quality: opts.quality,
        });

      case CompressionAlgorithm.GHOSTSCRIPT:
        return runGhostscriptCompression(inputBuffer, {
          quality: opts.quality,
          preset: opts.ghostscriptPreset,
          compatibilityLevel: opts.ghostscriptCompatibilityLevel,
          colorImageResolution: opts.ghostscriptColorImageResolution,
          grayImageResolution: opts.ghostscriptGrayImageResolution,
          monoImageResolution: opts.ghostscriptMonoImageResolution,
          downsampleImages: opts.ghostscriptDownsampleImages,
        });

      case CompressionAlgorithm.SMALLEST:
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }
  }

  private async compressWithSmallest(
    inputBuffer: Buffer,
    opts: NormalizedCompressOptions
  ): Promise<SelectedCompressionOutput> {
    const inputPages = await this.getPdfPageCount(inputBuffer);
    const failures: string[] = [];
    let best: SelectedCompressionOutput | undefined;

    for (const algorithm of SMALLEST_CANDIDATES) {
      const maxPhotonPages = getSmallestMaxPhotonPages();

      if (
        algorithm === CompressionAlgorithm.PHOTON &&
        inputPages > maxPhotonPages
      ) {
        const message = `skipped because input has ${inputPages} pages, exceeding SMALLEST_MAX_PHOTON_PAGES=${maxPhotonPages}`;
        failures.push(`${algorithm}: ${message}`);
        logger.warn(`[CompressionService] smallest candidate skipped: ${algorithm}: ${message}`);
        continue;
      }

      try {
        const candidate = await this.runSingleStrategy(algorithm, inputBuffer, opts);
        const pagesProcessed = await this.getPdfPageCount(candidate.output);

        if (pagesProcessed !== inputPages) {
          throw new Error(
            `page count changed from ${inputPages} to ${pagesProcessed}`
          );
        }

        const selectedCandidate: SelectedCompressionOutput = {
          ...candidate,
          pagesProcessed,
          algorithm,
        };

        if (!best || selectedCandidate.output.byteLength < best.output.byteLength) {
          best = selectedCandidate;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${algorithm}: ${message}`);
        logger.warn(`[CompressionService] smallest candidate failed: ${algorithm}: ${message}`);
      }
    }

    if (!best) {
      throw new Error(`All compression strategies failed: ${failures.join('; ')}`);
    }

    logger.info(
      `[CompressionService] smallest selected=${best.algorithm} ` +
        `size=${best.output.byteLength}`
    );

    return best;
  }

  private async getPdfPageCount(buffer: Buffer): Promise<number> {
    const pdf = await PDFDocument.load(buffer);
    return pdf.getPageCount();
  }
}

export const compressionService = new CompressionService();
