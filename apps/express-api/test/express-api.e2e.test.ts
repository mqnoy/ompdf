import request from 'supertest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createExpressApiApp } from '../src/app';
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

const mockedCompressPdf = compressPdf as jest.MockedFunction<typeof compressPdf>;

describe('express-api E2E', () => {
  const app = createExpressApiApp();
  let sourcePdf: Buffer;
  let compressedPdf: Buffer;

  beforeAll(async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Hello PDF Compression', {
      x: 50,
      y: 760,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawRectangle({ x: 50, y: 680, width: 240, height: 80, color: rgb(0.2, 0.4, 0.8) });
    page.drawText('Strategy fixture', {
      x: 60,
      y: 720,
      size: 18,
      font,
      color: rgb(1, 1, 1),
    });

    sourcePdf = Buffer.from(await pdfDoc.save());
    compressedPdf = Buffer.from(await pdfDoc.save());
  });

  beforeEach(() => {
    mockedCompressPdf.mockReset();
    mockedCompressPdf.mockResolvedValue({
      data: compressedPdf,
      stats: {
        originalSize: sourcePdf.byteLength,
        compressedSize: Math.max(1, compressedPdf.byteLength - 25),
        reductionPercent: 10,
        compressionRatio: '10.0%',
        algorithm: 'smallest',
        quality: 'medium',
        pagesProcessed: 1,
        processingTimeMs: 25,
        outputFilename: 'fixture_compressed.pdf',
      },
    });
  });

  async function expectPdfResponse(response: request.Response, expectedPages = 1): Promise<void> {
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('.pdf');
    expect(response.headers['x-compression-algorithm']).toBeTruthy();
    expect(response.headers['x-original-size']).toBeTruthy();
    expect(response.headers['x-compressed-size']).toBeTruthy();
    expect(response.headers['x-compression-ratio']).toBeTruthy();
    expect(response.headers['x-pages-processed']).toBeTruthy();

    const output = Buffer.from(response.body);
    expect(output.subarray(0, 5).toString()).toBe('%PDF-');

    const parsed = await PDFDocument.load(output);
    expect(parsed.getPageCount()).toBe(expectedPages);
  }

  function binaryParser(res: NodeJS.ReadableStream & { on: Function }, callback: (err: Error | null, body: Buffer) => void) {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  }

  test('GET /health returns 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'express-api');
  });

  test('GET /api/v1/compress/info returns algorithm metadata', async () => {
    const response = await request(app).get('/api/v1/compress/info');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.algorithms)).toBe(true);
    expect(response.body.algorithms.length).toBeGreaterThan(0);
  });

  test('missing file returns validation error', async () => {
    const response = await request(app)
      .post('/api/v1/compress')
      .field('algorithm', 'smallest');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('FILE_MISSING');
  });

  test('invalid algorithm returns validation error', async () => {
    const response = await request(app)
      .post('/api/v1/compress')
      .field('algorithm', 'nope')
      .attach('file', sourcePdf, 'fixture.pdf');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ALGORITHM');
    expect(mockedCompressPdf).not.toHaveBeenCalled();
  });

  test('smallest strategy compresses a PDF', async () => {
    const response = await request(app)
      .post('/api/v1/compress')
      .field('algorithm', 'smallest')
      .attach('file', sourcePdf, 'fixture.pdf')
      .buffer(true)
      .parse(binaryParser);

    await expectPdfResponse(response);
    expect(mockedCompressPdf).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ algorithm: 'smallest', quality: 'medium', filename: 'fixture.pdf' })
    );
  });

  test('mutool strategy alias works via strategy field', async () => {
    mockedCompressPdf.mockResolvedValueOnce({
      data: compressedPdf,
      stats: {
        originalSize: sourcePdf.byteLength,
        compressedSize: compressedPdf.byteLength,
        reductionPercent: 5,
        compressionRatio: '5.0%',
        algorithm: 'mutool',
        quality: 'maximum',
        pagesProcessed: 1,
        processingTimeMs: 20,
        outputFilename: 'fixture_mutool.pdf',
      },
    });

    const response = await request(app)
      .post('/api/v1/compress')
      .field('strategy', 'mutool')
      .field('quality', 'maximum')
      .attach('file', sourcePdf, 'fixture.pdf')
      .buffer(true)
      .parse(binaryParser);

    await expectPdfResponse(response);
    expect(response.headers['x-compression-algorithm']).toBe('mutool');
  });

  test('standard strategy accepts custom params', async () => {
    mockedCompressPdf.mockResolvedValueOnce({
      data: compressedPdf,
      stats: {
        originalSize: sourcePdf.byteLength,
        compressedSize: compressedPdf.byteLength,
        reductionPercent: 8,
        compressionRatio: '8.0%',
        algorithm: 'standard',
        quality: 'high',
        pagesProcessed: 1,
        processingTimeMs: 20,
        outputFilename: 'fixture_standard.pdf',
      },
    });

    const response = await request(app)
      .post('/api/v1/compress')
      .field('algorithm', 'standard')
      .field('quality', 'high')
      .field('removeMetadata', 'true')
      .field('optimizeImages', 'false')
      .attach('file', sourcePdf, 'fixture.pdf')
      .buffer(true)
      .parse(binaryParser);

    await expectPdfResponse(response);
    expect(response.headers['x-compression-algorithm']).toBe('standard');
  });

  test('condense strategy accepts custom params', async () => {
    mockedCompressPdf.mockResolvedValueOnce({
      data: compressedPdf,
      stats: {
        originalSize: sourcePdf.byteLength,
        compressedSize: compressedPdf.byteLength,
        reductionPercent: 4,
        compressionRatio: '4.0%',
        algorithm: 'condense',
        quality: 'low',
        pagesProcessed: 1,
        processingTimeMs: 20,
        outputFilename: 'fixture_condense.pdf',
      },
    });

    const response = await request(app)
      .post('/api/v1/compress')
      .field('algorithm', 'condense')
      .field('quality', 'low')
      .field('removeMetadata', 'true')
      .attach('file', sourcePdf, 'fixture.pdf')
      .buffer(true)
      .parse(binaryParser);

    await expectPdfResponse(response);
    expect(response.headers['x-compression-algorithm']).toBe('condense');
  });

  test('mutool strategy accepts custom params', async () => {
    mockedCompressPdf.mockResolvedValueOnce({
      data: compressedPdf,
      stats: {
        originalSize: sourcePdf.byteLength,
        compressedSize: compressedPdf.byteLength,
        reductionPercent: 6,
        compressionRatio: '6.0%',
        algorithm: 'mutool',
        quality: 'maximum',
        pagesProcessed: 1,
        processingTimeMs: 20,
        outputFilename: 'fixture_mutool.pdf',
      },
    });

    const response = await request(app)
      .post('/api/v1/compress')
      .field('algorithm', 'mutool')
      .field('quality', 'maximum')
      .attach('file', sourcePdf, 'fixture.pdf')
      .buffer(true)
      .parse(binaryParser);

    await expectPdfResponse(response);
    expect(response.headers['x-compression-algorithm']).toBe('mutool');
  });

  test('photon strategy accepts custom params', async () => {
    mockedCompressPdf.mockResolvedValueOnce({
      data: compressedPdf,
      stats: {
        originalSize: sourcePdf.byteLength,
        compressedSize: compressedPdf.byteLength,
        reductionPercent: 12,
        compressionRatio: '12.0%',
        algorithm: 'photon',
        quality: 'medium',
        pagesProcessed: 1,
        processingTimeMs: 20,
        outputFilename: 'fixture_photon.pdf',
      },
    });

    const response = await request(app)
      .post('/api/v1/compress')
      .field('algorithm', 'photon')
      .field('photonDpi', '96')
      .field('photonFormat', 'jpeg')
      .field('photonQuality', '60')
      .attach('file', sourcePdf, 'fixture.pdf')
      .buffer(true)
      .parse(binaryParser);

    await expectPdfResponse(response);
    expect(response.headers['x-compression-algorithm']).toBe('photon');
  });
});
