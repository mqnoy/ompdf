/**
 * Public PDF compression types.
 *
 * These names are intentionally library-facing. Keep HTTP/request-specific
 * details in controllers and internal types.
 */

export enum PdfCompressionAlgorithm {
  Standard = 'standard',
  Condense = 'condense',
  Mutool = 'mutool',
  Ghostscript = 'ghostscript',
  Smallest = 'smallest',
  Photon = 'photon',
}

export enum PdfCompressionQuality {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Maximum = 'maximum',
}

export enum PdfImageFormat {
  Jpeg = 'jpeg',
  Png = 'png',
}

export type PdfCompressionAlgorithmInput =
  | PdfCompressionAlgorithm
  | `${PdfCompressionAlgorithm}`;

export type PdfCompressionQualityInput =
  | PdfCompressionQuality
  | `${PdfCompressionQuality}`;

export type PdfImageFormatInput = PdfImageFormat | `${PdfImageFormat}`;

export interface PdfPhotonOptions {
  /** Target DPI for page rasterisation. Default: 150. */
  dpi?: number;
  /** Image format used per page. Default: jpeg. */
  format?: PdfImageFormatInput;
  /** JPEG quality from 1 to 100. Ignored for PNG. Default: 85. */
  quality?: number;
}

export type PdfGhostscriptPreset = 'screen' | 'ebook' | 'printer' | 'prepress' | 'default';
export type PdfGhostscriptCompatibilityLevel = '1.4' | '1.5' | '1.6' | '1.7';

export interface PdfGhostscriptOptions {
  /** Ghostscript PDFSETTINGS preset. Defaults from quality: low=screen, medium=ebook, high=printer, maximum=prepress. */
  preset?: PdfGhostscriptPreset;
  /** Output PDF compatibility level. Default: 1.4. */
  compatibilityLevel?: PdfGhostscriptCompatibilityLevel;
  /** Color image downsampling resolution in DPI. */
  colorImageResolution?: number;
  /** Grayscale image downsampling resolution in DPI. */
  grayImageResolution?: number;
  /** Monochrome image downsampling resolution in DPI. */
  monoImageResolution?: number;
  /** Whether Ghostscript should downsample images. */
  downsampleImages?: boolean;
}

export interface PdfCompressionOptions {
  /** Compression strategy. Default: photon. */
  algorithm?: PdfCompressionAlgorithmInput;
  /** Quality preset used by standard/condense engines. Default: medium. */
  quality?: PdfCompressionQualityInput;
  /** Original filename used to generate the output filename. */
  filename?: string;
  /** Strip PDF metadata where supported. Default: false. */
  removeMetadata?: boolean;
  /** Re-encode large embedded images where supported. Default: true. */
  optimizeImages?: boolean;
  /** Photon-specific rasterisation options. */
  photon?: PdfPhotonOptions;
  /** Ghostscript WASM pdfwrite-specific options. */
  ghostscript?: PdfGhostscriptOptions;
}

export interface CreatePdfCompressorOptions {
  /** Default options applied before each call-specific option object. */
  defaults?: PdfCompressionOptions;
}

export interface PdfCompressionStats {
  originalSize: number;
  compressedSize: number;
  /** Positive means smaller output; negative means output grew. */
  reductionPercent: number;
  /** Human-readable reduction percentage, e.g. "38.2%". */
  compressionRatio: string;
  algorithm: PdfCompressionAlgorithm;
  quality?: PdfCompressionQuality;
  pagesProcessed: number;
  processingTimeMs: number;
  outputFilename: string;
}

export interface PdfCompressionResult {
  /** Compressed PDF bytes. */
  data: Buffer;
  stats: PdfCompressionStats;
}

export interface PdfCompressor {
  compress(
    input: Buffer | Uint8Array | ArrayBuffer,
    options?: PdfCompressionOptions,
  ): Promise<PdfCompressionResult>;
}

export interface PdfCompressionError {
  code: string;
  message: string;
  details?: string;
}
