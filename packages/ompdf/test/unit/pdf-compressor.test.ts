import { compressPdf, PdfCompressionAlgorithm } from '../../src';
import { CompressionService } from '../../src/services/compression.service';
import { CompressionAlgorithm, CompressionQuality } from '../../src/types/compression.types';

jest.mock('../../src/services/compression.service');

const mockedCompress = CompressionService.prototype.compress as jest.MockedFunction<
  CompressionService['compress']
>;

describe('public PDF compressor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCompress.mockResolvedValue({
      buffer: Buffer.from('%PDF-output'),
      result: {
        originalSize: 10,
        compressedSize: 11,
        compressionRatio: '-10.00%',
        algorithm: CompressionAlgorithm.STANDARD,
        quality: CompressionQuality.MEDIUM,
        pagesProcessed: 1,
        processingTimeMs: 2,
        outputFilename: 'sample-compressed-standard.pdf',
      },
    });
  });

  it('does not overwrite service defaults with undefined public options', async () => {
    await compressPdf(Buffer.from('%PDF-input'), {
      algorithm: PdfCompressionAlgorithm.Standard,
      filename: 'sample.pdf',
    });

    expect(mockedCompress).toHaveBeenCalledWith(
      Buffer.from('%PDF-input'),
      'sample.pdf',
      { algorithm: CompressionAlgorithm.STANDARD },
    );
  });
});
