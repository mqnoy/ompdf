/**
 * Compression Router — /api/v1/compress
 */

import { Router } from 'express';
import { upload } from '../config/multer.config';
import { compressionController } from '../controllers/compression.controller';
import { validatePDF } from '../middleware/validatePDF';

const router = Router();

router.get('/info', compressionController.info.bind(compressionController));

router.post(
  '/',
  upload.single('file'),
  validatePDF,
  compressionController.compress.bind(compressionController)
);

export default router;
