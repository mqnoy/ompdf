/**
 * Standard Compression Engine
 *
 * Server-side port of the "standard" algorithm from:
 *   pdfcraft/src/lib/pdf/pymupdf-loader.ts  (compress method)
 *
 * Strategy (mirrors the Python):
 *   for each image xref in the PDF:
 *     extract → re-encode as JPEG at target quality → replace stream if smaller
 *   save(garbage=4, deflate=True, clean=True)
 *
 * Node.js equivalent:
 *   Use pdf-lib to iterate images; re-encode with sharp; replace XObject streams.
 */

import { PDFDocument, PDFName, PDFRawStream, PDFRef, decodePDFRawStream } from 'pdf-lib';
import sharp from 'sharp';
import { CompressionQuality, StandardOptions } from '../types/compression.types';
import { logger } from '../utils/logger';

// ─── Quality presets (image quality + max DPI per quality level) ───────────────

const QUALITY_PRESETS: Record<CompressionQuality, { imageQuality: number; maxDpi: number }> = {
  [CompressionQuality.LOW]: { imageQuality: 40, maxDpi: 72 },
  [CompressionQuality.MEDIUM]: { imageQuality: 65, maxDpi: 120 },
  [CompressionQuality.HIGH]: { imageQuality: 85, maxDpi: 200 },
  [CompressionQuality.MAXIMUM]: { imageQuality: 95, maxDpi: 300 },
};

/**
 * Execute the Standard compression algorithm.
 * Re-encodes images + saves with object-stream compression.
 */
export async function runStandardCompression(
  inputBuffer: Buffer,
  options: StandardOptions
): Promise<{ output: Buffer; pagesProcessed: number }> {
  const { quality, removeMetadata, optimizeImages } = options;
  const settings = QUALITY_PRESETS[quality];

  logger.info(`[Standard] quality=${quality} imageQuality=${settings.imageQuality} optimizeImages=${optimizeImages}`);

  const pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: false });
  const pages  = pdfDoc.getPages();

  if (optimizeImages) {
    // Iterate over all indirect objects looking for image XObjects
    const context = pdfDoc.context;
    let imagesProcessed = 0;

    // Enumerate objects via internal enumerateIndirectObjects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indirectObjects: Array<[PDFRef, unknown]> = (context as Record<string, any>).enumerateIndirectObjects();

    for (const [ref, obj] of indirectObjects) {
      // Only process raw streams (potential image XObjects)
      if (!(obj instanceof PDFRawStream)) continue;

      const dict = obj.dict;
      const subtypeObj = dict.get(PDFName.of('Subtype'));
      if (!subtypeObj || subtypeObj.toString() !== '/Image') continue;

      const widthObj  = dict.get(PDFName.of('Width'));
      const heightObj = dict.get(PDFName.of('Height'));
      if (!widthObj || !heightObj) continue;

      const width  = parseInt(widthObj.toString());
      const height = parseInt(heightObj.toString());

      // Skip small images (icons/decorators) – mirrors: if width < 50 or height < 50
      if (width < 50 || height < 50) continue;

      // Skip images that are already very small in byte size – mirrors: if len < 10000
      if (obj.contents.length < 10_000) continue;

      try {
        const imgBytes = decodePDFRawStream(obj).decode();

        // Try to decode with sharp; skip if unsupported format
        let sharpInst: sharp.Sharp;
        try {
          sharpInst = sharp(Buffer.from(imgBytes));
          const meta = await sharpInst.metadata();
          if (!meta.width || !meta.height) continue;
        } catch {
          continue;
        }

        // Re-encode as JPEG
        const reEncoded = await sharp(Buffer.from(imgBytes))
          .jpeg({ quality: settings.imageQuality, mozjpeg: true })
          .toBuffer();

        // Only replace if we achieved ≥ 10% reduction – mirrors: if len < len * 0.9
        const originalLength = obj.contents.length;
        if (reEncoded.length >= originalLength * 0.9) continue;

        // Replace the stream content (pdf-lib declares contents as readonly,
        // but mutating it directly is the supported low-level approach)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj as Record<string, any>).contents = new Uint8Array(reEncoded);

        // Update dictionary to reflect JPEG encoding (mirrors xref_set_key calls)
        dict.set(PDFName.of('Filter'),           PDFName.of('DCTDecode'));
        dict.set(PDFName.of('ColorSpace'),        PDFName.of('DeviceRGB'));
        dict.set(PDFName.of('BitsPerComponent'), pdfDoc.context.obj(8));
        dict.set(PDFName.of('Width'),            pdfDoc.context.obj(width));
        dict.set(PDFName.of('Height'),           pdfDoc.context.obj(height));
        dict.delete(PDFName.of('DecodeParms'));
        dict.set(PDFName.of('Length'),           pdfDoc.context.obj(reEncoded.length));

        imagesProcessed++;
        logger.debug(`[Standard] Replaced image xref ${ref} ${originalLength}b → ${reEncoded.length}b`);
      } catch (err) {
        // Skip images that can't be processed
        logger.debug(`[Standard] Skipping image xref ${ref}: ${err}`);
      }
    }

    logger.info(`[Standard] Optimized ${imagesProcessed} images`);
  }

  // Remove metadata if requested – mirrors: doc.set_metadata({}) + doc.del_xml_metadata()
  if (removeMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }

  // Save with garbage collection equivalent – mirrors: tobytes(garbage=4, deflate=True, clean=True)
  const compressedBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  const output = Buffer.from(compressedBytes);

  logger.info(`[Standard] Done. pages=${pages.length} outputSize=${output.byteLength}`);
  return { output, pagesProcessed: pages.length };
}
