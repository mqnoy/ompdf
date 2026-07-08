/**
 * Public PDF compression API.
 *
 * This module is the stable library-facing adapter over the internal
 * CompressionService implementation.
 */

import { CompressionService } from './services/compression.service';
import {
  CompressionAlgorithm,
  CompressionQuality,
  ImageFormat,
  CompressRequestBody,
} from './types/compression.types';
import {
  CreatePdfCompressorOptions,
  PdfCompressionAlgorithm,
  PdfCompressionOptions,
  PdfCompressionQuality,
  PdfCompressionResult,
  PdfCompressionStats,
  PdfCompressor,
  PdfImageFormat,
  PdfImageFormatInput,
} from './types/public.types';

const DEFAULT_FILENAME = 'document.pdf';

function toBuffer(input: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(input)) {
    return input;
  }

  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }

  return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

function toInternalAlgorithm(
  algorithm?: PdfCompressionOptions['algorithm'],
): CompressionAlgorithm | undefined {
  if (algorithm === undefined) {
    return undefined;
  }

  return algorithm as CompressionAlgorithm;
}

function toInternalQuality(
  quality?: PdfCompressionOptions['quality'],
): CompressionQuality | undefined {
  if (quality === undefined) {
    return undefined;
  }

  return quality as CompressionQuality;
}

function toInternalImageFormat(format?: PdfImageFormatInput): ImageFormat | undefined {
  if (format === undefined) {
    return undefined;
  }

  return format as ImageFormat;
}

function toPublicAlgorithm(algorithm: CompressionAlgorithm): PdfCompressionAlgorithm {
  return algorithm as unknown as PdfCompressionAlgorithm;
}

function toPublicQuality(quality?: CompressionQuality): PdfCompressionQuality | undefined {
  return quality as unknown as PdfCompressionQuality | undefined;
}

function normalizeOptions(options?: PdfCompressionOptions): Partial<CompressRequestBody> {
  return {
    algorithm: toInternalAlgorithm(options?.algorithm),
    quality: toInternalQuality(options?.quality),
    removeMetadata: options?.removeMetadata,
    optimizeImages: options?.optimizeImages,
    photonDpi: options?.photon?.dpi,
    photonFormat: toInternalImageFormat(options?.photon?.format),
    photonQuality: options?.photon?.quality,
    ghostscriptPreset: options?.ghostscript?.preset,
    ghostscriptCompatibilityLevel: options?.ghostscript?.compatibilityLevel,
    ghostscriptColorImageResolution: options?.ghostscript?.colorImageResolution,
    ghostscriptGrayImageResolution: options?.ghostscript?.grayImageResolution,
    ghostscriptMonoImageResolution: options?.ghostscript?.monoImageResolution,
    ghostscriptDownsampleImages: options?.ghostscript?.downsampleImages,
  };
}

function parseReductionPercent(compressionRatio: string): number {
  const parsed = Number.parseFloat(compressionRatio.replace('%', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPublicStats(
  result: Awaited<ReturnType<CompressionService['compress']>>['result'],
): PdfCompressionStats {
  return {
    originalSize: result.originalSize,
    compressedSize: result.compressedSize,
    reductionPercent: parseReductionPercent(result.compressionRatio),
    compressionRatio: result.compressionRatio,
    algorithm: toPublicAlgorithm(result.algorithm),
    quality: toPublicQuality(result.quality),
    pagesProcessed: result.pagesProcessed,
    processingTimeMs: result.processingTimeMs,
    outputFilename: result.outputFilename,
  };
}

class DefaultPdfCompressor implements PdfCompressor {
  constructor(
    private readonly service: CompressionService,
    private readonly defaults: PdfCompressionOptions = {},
  ) {}

  async compress(
    input: Buffer | Uint8Array | ArrayBuffer,
    options: PdfCompressionOptions = {},
  ): Promise<PdfCompressionResult> {
    const mergedOptions: PdfCompressionOptions = {
      ...this.defaults,
      ...options,
      photon: {
        ...this.defaults.photon,
        ...options.photon,
      },
      ghostscript: {
        ...this.defaults.ghostscript,
        ...options.ghostscript,
      },
    };

    const inputBuffer = toBuffer(input);
    const filename = mergedOptions.filename ?? DEFAULT_FILENAME;
    const { buffer, result } = await this.service.compress(
      inputBuffer,
      filename,
      normalizeOptions(mergedOptions),
    );

    return {
      data: buffer,
      stats: toPublicStats(result),
    };
  }
}

const defaultCompressor = new DefaultPdfCompressor(new CompressionService());

export function createPdfCompressor(
  options: CreatePdfCompressorOptions = {},
): PdfCompressor {
  return new DefaultPdfCompressor(new CompressionService(), options.defaults);
}

export async function compressPdf(
  input: Buffer | Uint8Array | ArrayBuffer,
  options?: PdfCompressionOptions,
): Promise<PdfCompressionResult> {
  return defaultCompressor.compress(input, options);
}
