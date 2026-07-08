import { generateCompressedFilename } from '../../src/utils/filename.util';
import { CompressionAlgorithm } from '../../src/types/compression.types';

describe('filename.util', () => {
  test('should append algorithm to filename', () => {
    const original = 'document.pdf';
    const result = generateCompressedFilename(original, CompressionAlgorithm.PHOTON);
    expect(result).toBe('document_photon_compressed.pdf');
  });

  test('should handle filenames without extensions', () => {
    const original = 'document';
    const result = generateCompressedFilename(original, CompressionAlgorithm.STANDARD);
    expect(result).toBe('document_standard_compressed.pdf');
  });

  test('should default to photon algorithm if not provided', () => {
    const original = 'test.pdf';
    const result = generateCompressedFilename(original);
    expect(result).toBe('test_photon_compressed.pdf');
  });

  test('should handle multiple dots in filename', () => {
    const original = 'my.report.2023.pdf';
    const result = generateCompressedFilename(original, CompressionAlgorithm.CONDENSE);
    expect(result).toBe('my.report.2023_condense_compressed.pdf');
  });
});
