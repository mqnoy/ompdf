/**
 * Multer configuration
 * Memory storage – keeps the uploaded file as a Buffer in req.file.buffer
 * Mirrors pdfcraft's approach of reading: const arrayBuffer = await file.arrayBuffer()
 */

import multer from 'multer';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(_req, file, cb) {
    // Accept only PDFs at the Multer level; deeper validation happens in middleware
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only PDF files are accepted.`));
    }
  },
});
