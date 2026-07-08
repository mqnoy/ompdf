/**
 * PDF Compression Types
 * Mirrors the type system from pdfcraft/src/types/pdf.ts
 * adapted for server-side Express usage.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum CompressionAlgorithm {
  /** Structure-level compression: garbage collection, deflate, image re-encoding */
  STANDARD = 'standard',
  /** Condense: structure-only, preserves interactivity */
  CONDENSE = 'condense',
  /** MuPDF/mutool WebAssembly-backed structure-level optimisation */
  MUTOOL = 'mutool',
  /** Ghostscript WebAssembly-backed pdfwrite optimisation */
  GHOSTSCRIPT = 'ghostscript',
  /** Try every strategy and return the smallest valid PDF output */
  SMALLEST = 'smallest',
  /**
   * Photon: rasterises every page to JPEG/PNG then rebuilds the PDF.
   * Best compression ratio; loses text-selectability and interactivity.
   */
  PHOTON = 'photon',
}

export enum CompressionQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  MAXIMUM = 'maximum',
}

export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface PhotonOptions {
  /** Target DPI for rasterisation. Default: 150 */
  dpi: number;
  /** Image format used per page. Default: jpeg */
  format: ImageFormat;
  /** JPEG quality 1–100. Ignored for PNG. Default: 85 */
  quality: number;
}

export interface StandardOptions {
  /** Compression quality preset */
  quality: CompressionQuality;
  /** Strip XMP / DocInfo metadata */
  removeMetadata: boolean;
  /** Re-encode large images at lower quality */
  optimizeImages: boolean;
}

export interface CondenseOptions {
  quality: CompressionQuality;
  removeMetadata: boolean;
}

export type GhostscriptPreset = 'screen' | 'ebook' | 'printer' | 'prepress' | 'default';
export type GhostscriptCompatibilityLevel = '1.4' | '1.5' | '1.6' | '1.7';

export interface GhostscriptOptions {
  quality?: CompressionQuality;
  preset?: GhostscriptPreset;
  compatibilityLevel?: GhostscriptCompatibilityLevel;
  colorImageResolution?: number;
  grayImageResolution?: number;
  monoImageResolution?: number;
  downsampleImages?: boolean;
}

export interface CompressRequestBody {
  algorithm: CompressionAlgorithm;
  // Shared
  quality?: CompressionQuality;
  removeMetadata?: boolean;
  optimizeImages?: boolean;
  // Photon-specific
  photonDpi?: number;
  photonFormat?: ImageFormat;
  photonQuality?: number;
  // Ghostscript-specific
  ghostscriptPreset?: GhostscriptPreset;
  ghostscriptCompatibilityLevel?: GhostscriptCompatibilityLevel;
  ghostscriptColorImageResolution?: number;
  ghostscriptGrayImageResolution?: number;
  ghostscriptMonoImageResolution?: number;
  ghostscriptDownsampleImages?: boolean;
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  /** Reduction percentage, e.g. "38.2%" */
  compressionRatio: string;
  algorithm: CompressionAlgorithm;
  quality?: CompressionQuality;
  pagesProcessed: number;
  processingTimeMs: number;
  outputFilename: string;
}

export interface CompressionError {
  code: string;
  message: string;
  details?: string;
}
