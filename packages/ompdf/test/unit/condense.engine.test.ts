import { PDFDocument } from 'pdf-lib';
import { runCondenseCompression } from '../../src/engines/condense.engine';
import { CompressionQuality } from '../../src/types/compression.types';

jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn(),
  },
}));

describe('condense.engine', () => {
  test('should load PDF and save with object streams', async () => {
    const mockPages = { length: 5 };
    const mockPdfDoc = {
      getPages: jest.fn().mockReturnValue(mockPages),
      save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      setTitle: jest.fn(),
      setAuthor: jest.fn(),
      setSubject: jest.fn(),
      setKeywords: jest.fn(),
      setProducer: jest.fn(),
      setCreator: jest.fn(),
    };
    (PDFDocument.load as jest.Mock).mockResolvedValue(mockPdfDoc);

    const result = await runCondenseCompression(Buffer.from('test'), {
      quality: CompressionQuality.MEDIUM,
      removeMetadata: true,
    });

    expect(PDFDocument.load).toHaveBeenCalled();
    expect(mockPdfDoc.save).toHaveBeenCalledWith(expect.objectContaining({ useObjectStreams: true }));
    expect(mockPdfDoc.setTitle).toHaveBeenCalledWith('');
    expect(result.pagesProcessed).toBe(5);
  });
});
