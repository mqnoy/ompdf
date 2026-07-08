import { runPhotonCompression } from '../../src/engines/photon.engine';
import { loadPyMuPDF } from '../../src/pkgs/pymupdf-wasm/pymupdf-loader';

jest.mock('../../src/pkgs/pymupdf-wasm/pymupdf-loader');
jest.mock('../../src/utils/logger');

describe('photon.engine', () => {
  test('should call photonCompress on pymupdf instance', async () => {
    const mockPymupdf = {
      photonCompress: jest.fn().mockResolvedValue({
        output: Buffer.from('compressed'),
        pagesProcessed: 10
      })
    };
    (loadPyMuPDF as jest.Mock).mockResolvedValue(mockPymupdf);

    const result = await runPhotonCompression(Buffer.from('test'), {
      photonDpi: 150,
      photonFormat: 'jpeg',
      photonQuality: 85
    });

    expect(loadPyMuPDF).toHaveBeenCalled();
    expect(mockPymupdf.photonCompress).toHaveBeenCalled();
    expect(result.pagesProcessed).toBe(10);
  });

  test('should use default values if options are missing', async () => {
    const mockPymupdf = {
      photonCompress: jest.fn().mockResolvedValue({
        output: Buffer.from('compressed'),
        pagesProcessed: 1
      })
    };
    (loadPyMuPDF as jest.Mock).mockResolvedValue(mockPymupdf);

    await runPhotonCompression(Buffer.from('test'), {});

    expect(mockPymupdf.photonCompress).toHaveBeenCalledWith(
      expect.any(Buffer),
      { dpi: 150, format: 'jpeg', quality: 85 }
    );
  });
});
