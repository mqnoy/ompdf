/**
 * Compression Controller
 * Handles POST /api/v1/compress
 */

import { NextFunction, Request, Response } from 'express';
import {
  compressPdf,
  PdfCompressionAlgorithm,
  PdfCompressionQuality,
  PdfImageFormat,
} from 'ompdf';
import type { PdfGhostscriptCompatibilityLevel, PdfGhostscriptPreset } from 'ompdf';
import type {
  CompressionAlgorithm,
  CompressionQuality,
  CompressionRequestBody,
  GhostscriptCompatibilityLevel,
  GhostscriptPreset,
  ImageFormat,
} from '../types/compression-request';
import { logger } from '../utils/logger';

const VALID_ALGORITHMS = [
  'standard',
  'condense',
  'mutool',
  'ghostscript',
  'smallest',
  'photon',
] satisfies CompressionAlgorithm[];
const VALID_QUALITIES = ['low', 'medium', 'high', 'maximum'] satisfies CompressionQuality[];
const VALID_FORMATS = ['jpeg', 'png'] satisfies ImageFormat[];
const VALID_GHOSTSCRIPT_PRESETS = ['screen', 'ebook', 'printer', 'prepress', 'default'] satisfies GhostscriptPreset[];
const VALID_GHOSTSCRIPT_COMPATIBILITY_LEVELS = ['1.4', '1.5', '1.6', '1.7'] satisfies GhostscriptCompatibilityLevel[];

function toPdfAlgorithm(value: CompressionAlgorithm): PdfCompressionAlgorithm {
  switch (value) {
    case 'standard':
      return PdfCompressionAlgorithm.Standard;
    case 'condense':
      return PdfCompressionAlgorithm.Condense;
    case 'mutool':
      return PdfCompressionAlgorithm.Mutool;
    case 'ghostscript':
      return PdfCompressionAlgorithm.Ghostscript;
    case 'smallest':
      return PdfCompressionAlgorithm.Smallest;
    case 'photon':
    default:
      return PdfCompressionAlgorithm.Photon;
  }
}

function toPdfQuality(value: CompressionQuality): PdfCompressionQuality {
  switch (value) {
    case 'low':
      return PdfCompressionQuality.Low;
    case 'high':
      return PdfCompressionQuality.High;
    case 'maximum':
      return PdfCompressionQuality.Maximum;
    case 'medium':
    default:
      return PdfCompressionQuality.Medium;
  }
}

function toPdfImageFormat(value: ImageFormat): PdfImageFormat {
  return value === 'png' ? PdfImageFormat.Png : PdfImageFormat.Jpeg;
}

export class CompressionController {
  async compress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file!;
      const body = req.body as Record<string, string>;

      const algorithm = (body.algorithm || body.strategy || 'smallest') as CompressionAlgorithm;
      if (!VALID_ALGORITHMS.includes(algorithm)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ALGORITHM',
            message: `algorithm must be one of: ${VALID_ALGORITHMS.join(', ')}`,
          },
        });
        return;
      }

      const quality = (body.quality || 'medium') as CompressionQuality;
      if (!VALID_QUALITIES.includes(quality)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUALITY',
            message: `quality must be one of: ${VALID_QUALITIES.join(', ')}`,
          },
        });
        return;
      }

      const photonFormat = (body.photonFormat || 'jpeg') as ImageFormat;
      if (!VALID_FORMATS.includes(photonFormat)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: `photonFormat must be one of: ${VALID_FORMATS.join(', ')}`,
          },
        });
        return;
      }

      const photonDpi = parseInt(body.photonDpi || '150', 10);
      const photonQuality = parseInt(body.photonQuality || '85', 10);
      const removeMetadata = body.removeMetadata === 'true';
      const optimizeImages = body.optimizeImages !== 'false';
      const ghostscriptPreset = body.ghostscriptPreset as GhostscriptPreset | undefined;
      const ghostscriptCompatibilityLevel =
        (body.ghostscriptCompatibilityLevel || '1.4') as GhostscriptCompatibilityLevel;
      const ghostscriptColorImageResolution = body.ghostscriptColorImageResolution
        ? parseInt(body.ghostscriptColorImageResolution, 10)
        : undefined;
      const ghostscriptGrayImageResolution = body.ghostscriptGrayImageResolution
        ? parseInt(body.ghostscriptGrayImageResolution, 10)
        : undefined;
      const ghostscriptMonoImageResolution = body.ghostscriptMonoImageResolution
        ? parseInt(body.ghostscriptMonoImageResolution, 10)
        : undefined;
      const ghostscriptDownsampleImages = body.ghostscriptDownsampleImages === undefined
        ? undefined
        : body.ghostscriptDownsampleImages === 'true';

      if (Number.isNaN(photonDpi) || photonDpi < 36 || photonDpi > 600) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_DPI', message: 'photonDpi must be between 36 and 600' },
        });
        return;
      }
      if (Number.isNaN(photonQuality) || photonQuality < 1 || photonQuality > 100) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_QUALITY_VALUE', message: 'photonQuality must be between 1 and 100' },
        });
        return;
      }
      if (ghostscriptPreset && !VALID_GHOSTSCRIPT_PRESETS.includes(ghostscriptPreset)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_GHOSTSCRIPT_PRESET',
            message: `ghostscriptPreset must be one of: ${VALID_GHOSTSCRIPT_PRESETS.join(', ')}`,
          },
        });
        return;
      }
      if (!VALID_GHOSTSCRIPT_COMPATIBILITY_LEVELS.includes(ghostscriptCompatibilityLevel)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_GHOSTSCRIPT_COMPATIBILITY',
            message:
              'ghostscriptCompatibilityLevel must be one of: ' +
              VALID_GHOSTSCRIPT_COMPATIBILITY_LEVELS.join(', '),
          },
        });
        return;
      }
      for (const [field, value] of Object.entries({
        ghostscriptColorImageResolution,
        ghostscriptGrayImageResolution,
        ghostscriptMonoImageResolution,
      })) {
        if (value !== undefined && (Number.isNaN(value) || value < 1 || value > 2400)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_GHOSTSCRIPT_RESOLUTION',
              message: `${field} must be between 1 and 2400`,
            },
          });
          return;
        }
      }

      const options: CompressionRequestBody = {
        algorithm,
        quality,
        removeMetadata,
        optimizeImages,
        photonDpi,
        photonFormat,
        photonQuality,
        ghostscriptPreset,
        ghostscriptCompatibilityLevel,
        ghostscriptColorImageResolution,
        ghostscriptGrayImageResolution,
        ghostscriptMonoImageResolution,
        ghostscriptDownsampleImages,
      };

      logger.info(`[CompressionController] Compressing "${file.originalname}" algorithm=${algorithm}`);

      const { data, stats } = await compressPdf(file.buffer, {
        algorithm: toPdfAlgorithm(algorithm),
        quality: toPdfQuality(quality),
        filename: file.originalname,
        removeMetadata: options.removeMetadata,
        optimizeImages: options.optimizeImages,
        photon: {
          dpi: options.photonDpi,
          format: options.photonFormat ? toPdfImageFormat(options.photonFormat) : undefined,
          quality: options.photonQuality,
        },
        ghostscript: {
          preset: options.ghostscriptPreset as PdfGhostscriptPreset | undefined,
          compatibilityLevel:
            options.ghostscriptCompatibilityLevel as PdfGhostscriptCompatibilityLevel | undefined,
          colorImageResolution: options.ghostscriptColorImageResolution,
          grayImageResolution: options.ghostscriptGrayImageResolution,
          monoImageResolution: options.ghostscriptMonoImageResolution,
          downsampleImages: options.ghostscriptDownsampleImages,
        },
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', data.byteLength.toString());
      res.setHeader('Content-Disposition', `attachment; filename="${stats.outputFilename}"`);
      res.setHeader('X-Original-Size', stats.originalSize.toString());
      res.setHeader('X-Compressed-Size', stats.compressedSize.toString());
      res.setHeader('X-Compression-Ratio', stats.compressionRatio);
      res.setHeader('X-Compression-Algorithm', stats.algorithm);
      res.setHeader('X-Pages-Processed', stats.pagesProcessed.toString());
      res.setHeader('X-Processing-Time-Ms', stats.processingTimeMs.toString());
      res.setHeader(
        'Access-Control-Expose-Headers',
        [
          'X-Original-Size',
          'X-Compressed-Size',
          'X-Compression-Ratio',
          'X-Compression-Algorithm',
          'X-Pages-Processed',
          'X-Processing-Time-Ms',
        ].join(', ')
      );

      res.status(200).send(data);
    } catch (err) {
      next(err);
    }
  }

  async info(_req: Request, res: Response): Promise<void> {
    res.json({
      algorithms: [
        {
          id: 'photon',
          name: 'Photon',
          description:
            'Rasterises every page to a JPEG/PNG image then rebuilds the PDF. Best compression ratio. Loses text selectability and interactivity.',
          recommended: 'Scanned documents, image-heavy PDFs.',
          options: ['photonDpi', 'photonFormat', 'photonQuality'],
        },
        {
          id: 'standard',
          name: 'Standard',
          description:
            'Re-encodes embedded images at lower quality + deflates PDF streams. Preserves text selectability and basic interactivity.',
          recommended: 'General-purpose PDFs with embedded images.',
          options: ['quality', 'removeMetadata', 'optimizeImages'],
        },
        {
          id: 'condense',
          name: 'Condense',
          description:
            'Structure-only compression: garbage collection + deflate. Fully preserves interactivity and text selectability. Smallest overhead; best for already-compressed PDFs.',
          recommended: 'Forms, signed PDFs, well-structured documents.',
          options: ['quality', 'removeMetadata'],
        },
        {
          id: 'mutool',
          name: 'MuTool',
          description:
            'Uses the MuPDF WebAssembly engine for structure-level optimisation without external binaries.',
          recommended: 'Large PDFs where object-stream optimisation performs best.',
          options: ['quality'],
        },
        {
          id: 'ghostscript',
          name: 'Ghostscript',
          description:
            'Uses Ghostscript WebAssembly pdfwrite for print-style optimisation controls.',
          recommended: 'Workflows that need Ghostscript preset or compatibility tuning.',
          options: ['quality', 'ghostscriptPreset', 'ghostscriptCompatibilityLevel'],
        },
        {
          id: 'smallest',
          name: 'Smallest',
          description:
            'Tries multiple strategies and returns the smallest valid PDF output.',
          recommended: 'Default choice when you want the best size reduction automatically.',
          options: ['quality', 'removeMetadata', 'optimizeImages'],
        },
      ],
      qualityPresets: {
        low: { imageQuality: 40, maxDpi: 72, description: 'Smallest file size' },
        medium: { imageQuality: 65, maxDpi: 120, description: 'Balanced (default)' },
        high: { imageQuality: 85, maxDpi: 200, description: 'Good quality' },
        maximum: { imageQuality: 95, maxDpi: 300, description: 'Near-lossless' },
      },
    });
  }
}

export const compressionController = new CompressionController();
