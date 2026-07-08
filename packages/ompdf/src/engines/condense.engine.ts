/**
 * Condense Compression Engine
 *
 * Server-side port of the "condense" algorithm from:
 *   pdfcraft/src/lib/pdf/pymupdf-loader.ts  (compress method — clean/garbage path)
 *
 * Strategy:
 *   - Load PDF and save with useObjectStreams=true (equivalent to garbage=4 + deflate=True)
 *   - Preserves all interactivity (forms, annotations, links)
 *   - No image re-encoding; purely structural compression
 *
 * This mirrors:
 *   doc.save(garbage=4, deflate=True)   in Python/PyMuPDF
 */

import { PDFDocument } from 'pdf-lib';
import { CondenseOptions } from '../types/compression.types';
import { logger } from '../utils/logger';

/**
 * Execute the Condense compression algorithm.
 */
export async function runCondenseCompression(
  inputBuffer: Buffer,
  options: CondenseOptions
): Promise<{ output: Buffer; pagesProcessed: number }> {
  const { quality, removeMetadata } = options;

  logger.info(`[Condense] quality=${quality} removeMetadata=${removeMetadata}`);

  const pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: false });
  const pages  = pdfDoc.getPages();

  if (removeMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }

  // mirrors: doc.save(garbage=4, deflate=True)
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,   // Cross-reference streams = deflate + garbage-collect unused
    addDefaultPage: false,
  });

  const output = Buffer.from(compressedBytes);

  logger.info(`[Condense] Done. pages=${pages.length} outputSize=${output.byteLength}`);
  return { output, pagesProcessed: pages.length };
}
