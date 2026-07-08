import { PDFDocument, StandardFonts } from 'pdf-lib';
import { compressionService } from '../../src/services/compression.service';
import { runPhotonCompression } from '../../src/engines/photon.engine';
import { runStandardCompression } from '../../src/engines/standard.engine';
import { runCondenseCompression } from '../../src/engines/condense.engine';
import { runMutoolCompression } from '../../src/engines/mutool.engine';
import { runGhostscriptCompression } from '../../src/engines/ghostscript.engine';
import {
  CompressionAlgorithm,
  CompressionQuality,
  ImageFormat,
} from '../../src/types/compression.types';

jest.mock('../../src/engines/photon.engine', () => ({
  runPhotonCompression: jest.fn(),
}));

jest.mock('../../src/engines/standard.engine', () => ({
  runStandardCompression: jest.fn(),
}));

jest.mock('../../src/engines/condense.engine', () => ({
  runCondenseCompression: jest.fn(),
}));

jest.mock('../../src/engines/mutool.engine', () => ({
  runMutoolCompression: jest.fn(),
}));

jest.mock('../../src/engines/ghostscript.engine', () => ({
  runGhostscriptCompression: jest.fn(),
}));

const mockedPhoton = runPhotonCompression as jest.MockedFunction<typeof runPhotonCompression>;
const mockedStandard = runStandardCompression as jest.MockedFunction<typeof runStandardCompression>;
const mockedCondense = runCondenseCompression as jest.MockedFunction<typeof runCondenseCompression>;
const mockedMutool = runMutoolCompression as jest.MockedFunction<typeof runMutoolCompression>;
const mockedGhostscript = runGhostscriptCompression as jest.MockedFunction<typeof runGhostscriptCompression>;

async function createPdfBuffer(label: string, repeatedLines = 1): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([320, 240]);

  for (let i = 0; i < repeatedLines; i++) {
    page.drawText(`${label} ${i}`, { x: 20, y: 210 - i * 10, size: 8, font });
  }

  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}

let input: Buffer;
let defaultOutput: Buffer;
let standardOutput: Buffer;
let condenseOutput: Buffer;
let mutoolOutput: Buffer;
let ghostscriptOutput: Buffer;
let photonOutput: Buffer;

describe('compressionService', () => {
  beforeAll(async () => {
    input = await createPdfBuffer('input', 2);
    defaultOutput = await createPdfBuffer('default-output', 3);
    standardOutput = await createPdfBuffer('standard-large', 18);
    condenseOutput = await createPdfBuffer('condense-medium', 14);
    mutoolOutput = await createPdfBuffer('mutool-medium', 10);
    ghostscriptOutput = await createPdfBuffer('g', 1);
    photonOutput = await createPdfBuffer('photon-largest', 22);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPhoton.mockResolvedValue({ output: defaultOutput, pagesProcessed: 1 });
    mockedStandard.mockResolvedValue({ output: defaultOutput, pagesProcessed: 1 });
    mockedCondense.mockResolvedValue({ output: defaultOutput, pagesProcessed: 1 });
    mockedMutool.mockResolvedValue({ output: defaultOutput, pagesProcessed: 1 });
    mockedGhostscript.mockResolvedValue({ output: defaultOutput, pagesProcessed: 1 });
  });

  it('routes photon compression to the photon engine by default', async () => {
    const { buffer, result } = await compressionService.compress(input, 'input.pdf', {});

    expect(mockedPhoton).toHaveBeenCalledWith(input, {
      photonDpi: 150,
      photonFormat: ImageFormat.JPEG,
      photonQuality: 85,
    });
    expect(buffer).toBe(defaultOutput);
    expect(result.algorithm).toBe(CompressionAlgorithm.PHOTON);
    expect(result.pagesProcessed).toBe(1);
  });

  it('routes standard compression to the standard engine', async () => {
    await compressionService.compress(input, 'input.pdf', {
      algorithm: CompressionAlgorithm.STANDARD,
      quality: CompressionQuality.HIGH,
    });

    expect(mockedStandard).toHaveBeenCalledWith(input, {
      quality: CompressionQuality.HIGH,
      removeMetadata: false,
      optimizeImages: true,
    });
  });

  it('routes condense compression to the condense engine', async () => {
    await compressionService.compress(input, 'input.pdf', {
      algorithm: CompressionAlgorithm.CONDENSE,
      quality: CompressionQuality.LOW,
    });

    expect(mockedCondense).toHaveBeenCalledWith(input, {
      quality: CompressionQuality.LOW,
      removeMetadata: false,
    });
  });

  it('routes mutool compression to the MuPDF WASM engine', async () => {
    await compressionService.compress(input, 'input.pdf', {
      algorithm: CompressionAlgorithm.MUTOOL,
      quality: CompressionQuality.MAXIMUM,
    });

    expect(mockedMutool).toHaveBeenCalledWith(input, {
      quality: CompressionQuality.MAXIMUM,
    });
  });

  it('routes ghostscript compression to the Ghostscript WASM engine', async () => {
    await compressionService.compress(input, 'input.pdf', {
      algorithm: CompressionAlgorithm.GHOSTSCRIPT,
      quality: CompressionQuality.MEDIUM,
      ghostscriptPreset: 'ebook',
      ghostscriptCompatibilityLevel: '1.5',
      ghostscriptColorImageResolution: 144,
      ghostscriptGrayImageResolution: 120,
      ghostscriptMonoImageResolution: 300,
      ghostscriptDownsampleImages: true,
    });

    expect(mockedGhostscript).toHaveBeenCalledWith(input, {
      quality: CompressionQuality.MEDIUM,
      preset: 'ebook',
      compatibilityLevel: '1.5',
      colorImageResolution: 144,
      grayImageResolution: 120,
      monoImageResolution: 300,
      downsampleImages: true,
    });
  });

  it('runs all strategies and returns the smallest valid output', async () => {
    mockedStandard.mockResolvedValue({ output: standardOutput, pagesProcessed: 1 });
    mockedCondense.mockResolvedValue({ output: condenseOutput, pagesProcessed: 1 });
    mockedMutool.mockResolvedValue({ output: mutoolOutput, pagesProcessed: 1 });
    mockedGhostscript.mockResolvedValue({ output: ghostscriptOutput, pagesProcessed: 1 });
    mockedPhoton.mockResolvedValue({ output: photonOutput, pagesProcessed: 1 });

    const { buffer, result } = await compressionService.compress(input, 'input.pdf', {
      algorithm: CompressionAlgorithm.SMALLEST,
      quality: CompressionQuality.MEDIUM,
    });

    expect(mockedStandard).toHaveBeenCalled();
    expect(mockedCondense).toHaveBeenCalled();
    expect(mockedMutool).toHaveBeenCalled();
    expect(mockedGhostscript).toHaveBeenCalled();
    expect(mockedPhoton).toHaveBeenCalled();
    expect(buffer).toBe(ghostscriptOutput);
    expect(result.algorithm).toBe(CompressionAlgorithm.GHOSTSCRIPT);
    expect(result.compressedSize).toBe(ghostscriptOutput.byteLength);
  });

  it('ignores failed strategies when selecting the smallest output', async () => {
    mockedStandard.mockRejectedValue(new Error('standard failed'));
    mockedCondense.mockResolvedValue({ output: condenseOutput, pagesProcessed: 1 });
    mockedMutool.mockResolvedValue({ output: mutoolOutput, pagesProcessed: 1 });
    mockedGhostscript.mockRejectedValue(new Error('ghostscript failed'));
    mockedPhoton.mockResolvedValue({ output: photonOutput, pagesProcessed: 1 });

    const { buffer, result } = await compressionService.compress(input, 'input.pdf', {
      algorithm: CompressionAlgorithm.SMALLEST,
    });

    expect(buffer).toBe(mutoolOutput);
    expect(result.algorithm).toBe(CompressionAlgorithm.MUTOOL);
  });

  it('throws for unsupported algorithms', async () => {
    await expect(
      compressionService.compress(input, 'input.pdf', {
        algorithm: 'unknown' as CompressionAlgorithm,
      }),
    ).rejects.toThrow('Unknown algorithm: unknown');
  });

  it('throws when every smallest candidate fails', async () => {
    mockedStandard.mockRejectedValue(new Error('standard failed'));
    mockedCondense.mockRejectedValue(new Error('condense failed'));
    mockedMutool.mockRejectedValue(new Error('mutool failed'));
    mockedGhostscript.mockRejectedValue(new Error('ghostscript failed'));
    mockedPhoton.mockRejectedValue(new Error('photon failed'));

    await expect(
      compressionService.compress(input, 'input.pdf', {
        algorithm: CompressionAlgorithm.SMALLEST,
      }),
    ).rejects.toThrow('All compression strategies failed');
  });
});
