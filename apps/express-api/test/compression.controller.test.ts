import { Request, Response } from 'express';
import {
  PdfCompressionAlgorithm,
  PdfCompressionQuality,
  type PdfCompressionResult,
} from 'ompdf';
import { CompressionController } from '../src/controllers/compression.controller';
import { compressPdf } from 'ompdf';

jest.mock('ompdf', () => ({
  compressPdf: jest.fn(),
  PdfCompressionAlgorithm: {
    Standard: 'standard',
    Condense: 'condense',
    Mutool: 'mutool',
    Ghostscript: 'ghostscript',
    Smallest: 'smallest',
    Photon: 'photon',
  },
  PdfCompressionQuality: {
    Low: 'low',
    Medium: 'medium',
    High: 'high',
    Maximum: 'maximum',
  },
  PdfImageFormat: {
    Jpeg: 'jpeg',
    Png: 'png',
  },
}));

jest.mock('../src/utils/logger');

describe('CompressionController', () => {
  let controller: CompressionController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  const mockedCompressPdf = compressPdf as jest.MockedFunction<typeof compressPdf>;

  beforeEach(() => {
    controller = new CompressionController();
    mockRequest = {
      file: {
        buffer: Buffer.from('%PDF-1.4\n'),
        originalname: 'test.pdf',
        size: 100,
        mimetype: 'application/pdf',
      } as unknown as Express.Multer.File,
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    mockedCompressPdf.mockReset();
  });

  test('returns 400 for invalid algorithm', async () => {
    mockRequest.body = { algorithm: 'invalid' };

    await controller.compress(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_ALGORITHM' }),
      })
    );
  });

  test('returns 400 for invalid quality', async () => {
    mockRequest.body = { quality: 'invalid' };

    await controller.compress(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 for invalid DPI', async () => {
    mockRequest.body = { photonDpi: '10' };

    await controller.compress(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'INVALID_DPI' }) })
    );
  });

  test('calls compressPdf with parsed options and writes headers', async () => {
    const result: PdfCompressionResult = {
      data: Buffer.from('%PDF-1.4\nmock'),
      stats: {
        originalSize: 100,
        compressedSize: 80,
        reductionPercent: 20,
        compressionRatio: '20.0%',
        algorithm: PdfCompressionAlgorithm.Standard,
        quality: PdfCompressionQuality.High,
        pagesProcessed: 1,
        processingTimeMs: 12,
        outputFilename: 'test_standard_compressed.pdf',
      },
    };
    mockedCompressPdf.mockResolvedValue(result);
    mockRequest.body = {
      algorithm: 'standard',
      quality: 'high',
      removeMetadata: 'true',
      optimizeImages: 'false',
      photonDpi: '96',
      photonFormat: 'jpeg',
      photonQuality: '60',
    };

    await controller.compress(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockedCompressPdf).toHaveBeenCalledWith(
      Buffer.from('%PDF-1.4\n'),
      expect.objectContaining({
        algorithm: PdfCompressionAlgorithm.Standard,
        quality: PdfCompressionQuality.High,
        filename: 'test.pdf',
        removeMetadata: true,
        optimizeImages: false,
      })
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(mockResponse.send).toHaveBeenCalledWith(result.data);
  });
});
