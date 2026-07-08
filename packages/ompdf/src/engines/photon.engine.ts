/**
 * Photon Engine Service
 *
 * Thin orchestration layer that calls pymupdf-loader's photonCompress.
 * Accepts a raw Buffer and returns a compressed Buffer + metadata.
 */

import { loadPyMuPDF, PhotonCompressOptions, PhotonCompressResult } from '../pkgs/pymupdf-wasm/pymupdf-loader';
import { logger } from '../utils/logger';

export interface CompressPDFOptions {
  /** DPI for Photon algorithm (default: 150) */
  photonDpi?: number;
  /** Image format for Photon algorithm */
  photonFormat?: 'jpeg' | 'png';
  /** JPEG quality for Photon algorithm (0-100) */
  photonQuality?: number;
}

/**
 * Compress a PDF buffer using the Photon algorithm.
 * Rasterises every page to JPEG at the target DPI via PyMuPDF WASM.
 */
export async function runPhotonCompression(
  buffer: Buffer,
  options: CompressPDFOptions,
): Promise<{ output: Buffer; pagesProcessed: number }> {
  logger.info('[PhotonService] Loading PyMuPDF …');
  const pymupdf = await loadPyMuPDF();

  logger.info('[PhotonService] Rasterising pages …');
  const opts: PhotonCompressOptions = {
    dpi: options.photonDpi ?? 150,
    format: options.photonFormat ?? 'jpeg',
    quality: options.photonQuality ?? 85,
  };

  const result: PhotonCompressResult = await pymupdf.photonCompress(buffer, opts);

  logger.info(`[PhotonService] Done — ${result.pagesProcessed} pages processed`);
  return result;
}