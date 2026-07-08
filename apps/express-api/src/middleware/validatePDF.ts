/**
 * PDF validation middleware
 * Validates uploaded files are valid PDFs before processing
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

export function validatePDF(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_MISSING',
        message: 'No PDF file provided. Upload a file using the "file" field.',
      },
    });
    return;
  }

  const file = req.file;

  // MIME type check
  if (file.mimetype !== 'application/pdf') {
    res.status(415).json({
      success: false,
      error: {
        code: 'FILE_TYPE_INVALID',
        message: `Expected application/pdf, received ${file.mimetype}`,
      },
    });
    return;
  }

  // Magic bytes check (%PDF)
  const magic = file.buffer.slice(0, 4);
  if (!magic.equals(PDF_MAGIC)) {
    res.status(422).json({
      success: false,
      error: {
        code: 'FILE_NOT_PDF',
        message: 'File does not appear to be a valid PDF (wrong magic bytes).',
      },
    });
    return;
  }

  logger.info(`[validatePDF] OK — name="${file.originalname}" size=${file.size}`);
  next();
}
