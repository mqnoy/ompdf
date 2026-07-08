import { loadPyMuPDF, resetPyMuPDF } from '../../src/pkgs/pymupdf-wasm/pymupdf-loader';
import * as pyodideModule from 'pyodide';

jest.mock('pyodide', () => ({
  loadPyodide: jest.fn(),
}));
jest.mock('../../src/utils/logger');

describe('pymupdf-loader', () => {
  beforeEach(() => {
    resetPyMuPDF();
    jest.clearAllMocks();
  });

  test('loadPyMuPDF should initialize pyodide and return an instance', async () => {
    const mockPyodide = {
      runPython: jest.fn(),
      runPythonAsync: jest.fn().mockResolvedValue('{"pages": 5}|||Y29tcHJlc3NlZA=='), // base64 for 'compressed'
      loadPackage: jest.fn(),
      pyimport: jest.fn().mockReturnValue({
        install: jest.fn().mockResolvedValue(true)
      }),
      FS: {
        writeFile: jest.fn(),
        unlink: jest.fn(),
      }
    };
    (pyodideModule.loadPyodide as jest.Mock).mockResolvedValue(mockPyodide);

    const instance = await loadPyMuPDF();
    expect(instance).toBeDefined();
    expect(pyodideModule.loadPyodide).toHaveBeenCalled();

    const result = await instance.photonCompress(Buffer.from('test'), { dpi: 150 });
    expect(result.pagesProcessed).toBe(5);
    expect(result.output.toString()).toBe('compressed');
    expect(mockPyodide.FS.writeFile).toHaveBeenCalled();
  });

  test('should return singleton instance on second call', async () => {
    const mockPyodide = {
      runPython: jest.fn(),
      runPythonAsync: jest.fn(),
      loadPackage: jest.fn(),
      pyimport: jest.fn().mockReturnValue({ install: jest.fn() }),
    };
    (pyodideModule.loadPyodide as jest.Mock).mockResolvedValue(mockPyodide);

    const instance1 = await loadPyMuPDF();
    const instance2 = await loadPyMuPDF();

    expect(instance1).toBe(instance2);
    expect(pyodideModule.loadPyodide).toHaveBeenCalledTimes(1);
  });

  test('loadPyMuPDF should handle errors', async () => {
    (pyodideModule.loadPyodide as jest.Mock).mockRejectedValue(new Error('Init failed'));
    await expect(loadPyMuPDF()).rejects.toThrow('Init failed');
  });

  test('photonCompress should handle empty result split', async () => {
    const mockPyodide = {
      runPython: jest.fn(),
      runPythonAsync: jest.fn().mockResolvedValue('invalid_format'),
      loadPackage: jest.fn(),
      pyimport: jest.fn().mockReturnValue({ install: jest.fn() }),
      FS: { writeFile: jest.fn(), unlink: jest.fn() }
    };
    (pyodideModule.loadPyodide as jest.Mock).mockResolvedValue(mockPyodide);

    const instance = await loadPyMuPDF();
    await expect(instance.photonCompress(Buffer.from('test'))).rejects.toThrow();
  });
});
