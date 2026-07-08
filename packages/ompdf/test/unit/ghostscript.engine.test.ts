import {
  buildGhostscriptArgs,
  ghostscriptPresetForQuality,
} from '../../src/engines/ghostscript.engine';
import { CompressionQuality } from '../../src/types/compression.types';

describe('ghostscript.engine', () => {
  it('maps compression quality to Ghostscript PDFSETTINGS presets', () => {
    expect(ghostscriptPresetForQuality(CompressionQuality.LOW)).toBe('screen');
    expect(ghostscriptPresetForQuality(CompressionQuality.MEDIUM)).toBe('ebook');
    expect(ghostscriptPresetForQuality(CompressionQuality.HIGH)).toBe('printer');
    expect(ghostscriptPresetForQuality(CompressionQuality.MAXIMUM)).toBe('prepress');
  });

  it('builds pdfwrite args with explicit preset and custom image options', () => {
    const args = buildGhostscriptArgs('/input.pdf', '/output.pdf', {
      quality: CompressionQuality.LOW,
      preset: 'ebook',
      compatibilityLevel: '1.5',
      colorImageResolution: 144,
      grayImageResolution: 120,
      monoImageResolution: 300,
      downsampleImages: true,
    });

    expect(args).toEqual(expect.arrayContaining([
      '-q',
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.5',
      '-dPDFSETTINGS=/ebook',
      '-dDownsampleColorImages=true',
      '-dDownsampleGrayImages=true',
      '-dDownsampleMonoImages=true',
      '-dColorImageResolution=144',
      '-dGrayImageResolution=120',
      '-dMonoImageResolution=300',
      '-sOutputFile=/output.pdf',
      '/input.pdf',
    ]));
  });
});
