import { PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { runStandardCompression } from '../../src/engines/standard.engine';
import { CompressionQuality } from '../../src/types/compression.types';
import sharp from 'sharp';

jest.mock('pdf-lib', () => {
  const actual = jest.requireActual('pdf-lib');
  return {
    ...actual,
    PDFDocument: {
      load: jest.fn(),
    },
    decodePDFRawStream: jest.fn(),
  };
});
jest.mock('sharp');
jest.mock('../../src/utils/logger');

describe('standard.engine', () => {
  test('should process images and save PDF', async () => {
    const mockPages = { length: 2 };
    const mockDict = {
      get: jest.fn((name) => {
        const n = name.toString();
        if (n === '/Subtype') return '/Image';
        if (n === '/Width') return '100';
        if (n === '/Height') return '100';
        return null;
      }),
      set: jest.fn(),
      delete: jest.fn(),
    };
    
    // Create a mock stream that looks like an image
    type Constructor<T> = new (...args: unknown[]) => T;
    const mockStream = new (PDFRawStream as unknown as Constructor<PDFRawStream>)(mockDict, new Uint8Array(20000));
    
    // Create another mock stream that is too small (should be skipped)
    const smallDict = {
      get: jest.fn((name) => {
        const n = name.toString();
        if (n === '/Subtype') return '/Image';
        if (n === '/Width') return '10';
        if (n === '/Height') return '10';
        return null;
      }),
    };
    const smallStream = new (PDFRawStream as unknown as Constructor<PDFRawStream>)(smallDict, new Uint8Array(100));

    const mockPdfDoc = {
      getPages: jest.fn().mockReturnValue(mockPages),
      context: {
        enumerateIndirectObjects: jest.fn().mockReturnValue([
          ['1 0 R', mockStream],
          ['2 0 R', smallStream],
          ['3 0 R', { not: 'a stream' }] // Should be skipped
        ]),
        obj: jest.fn((v) => v),
      },
      save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      setTitle: jest.fn(),
      setAuthor: jest.fn(),
      setSubject: jest.fn(),
      setKeywords: jest.fn(),
      setProducer: jest.fn(),
      setCreator: jest.fn(),
    };
    (PDFDocument.load as jest.Mock).mockResolvedValue(mockPdfDoc);

    // Mock decodePDFRawStream
    (decodePDFRawStream as jest.Mock).mockReturnValue({
      decode: jest.fn().mockReturnValue(new Uint8Array([0, 0, 0]))
    });

    // Mock sharp re-encoding
    const mockSharp = {
      metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('small')),
    };
    (sharp as unknown as jest.Mock).mockReturnValue(mockSharp);

    const result = await runStandardCompression(Buffer.from('test'), {
      quality: CompressionQuality.MEDIUM,
      removeMetadata: true,
      optimizeImages: true,
    });

    expect(PDFDocument.load).toHaveBeenCalled();
    expect(mockPdfDoc.save).toHaveBeenCalled();
    expect(result.pagesProcessed).toBe(2);
  });

  test('should skip image optimization if optimizeImages is false', async () => {
    const mockPdfDoc = {
      getPages: jest.fn().mockReturnValue({ length: 1 }),
      save: jest.fn().mockResolvedValue(new Uint8Array([1])),
    };
    (PDFDocument.load as jest.Mock).mockResolvedValue(mockPdfDoc);

    await runStandardCompression(Buffer.from('test'), {
      quality: CompressionQuality.MEDIUM,
      removeMetadata: false,
      optimizeImages: false,
    });

    expect(mockPdfDoc.save).toHaveBeenCalled();
  });

  test('should handle PDF load errors', async () => {
    (PDFDocument.load as jest.Mock).mockRejectedValue(new Error('Load failed'));
    await expect(runStandardCompression(Buffer.from('test'), {
      quality: CompressionQuality.MEDIUM,
      removeMetadata: false,
      optimizeImages: false,
    })).rejects.toThrow('Load failed');
  });

  test('should skip metadata removal if removeMetadata is false', async () => {
    const mockPdfDoc = {
      getPages: jest.fn().mockReturnValue({ length: 1 }),
      save: jest.fn().mockResolvedValue(new Uint8Array([1])),
      setTitle: jest.fn(),
    };
    (PDFDocument.load as jest.Mock).mockResolvedValue(mockPdfDoc);

    await runStandardCompression(Buffer.from('test'), {
      quality: CompressionQuality.MEDIUM,
      removeMetadata: false,
      optimizeImages: false,
    });

    expect(mockPdfDoc.setTitle).not.toHaveBeenCalled();
  });
});
