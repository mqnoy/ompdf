/**
 * Filename utilities
 * Mirrors generateCompressedFilename() from pdfcraft compress.ts
 */
import { CompressionAlgorithm } from '../types/compression.types';

/**
 * Generate output filename: `{base}_{algorithm}_compressed.pdf`
 * e.g. "report.pdf" → "report_photon_compressed.pdf"
 */
export function generateCompressedFilename(
  originalName: string,
  algorithm: CompressionAlgorithm = CompressionAlgorithm.PHOTON
): string {
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot === -1 ? originalName : originalName.slice(0, lastDot);
  return `${baseName}_${algorithm}_compressed.pdf`;
}
