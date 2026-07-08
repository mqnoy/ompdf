import { compressPdf, PdfCompressionAlgorithm, PdfCompressionQuality } from 'ompdf';
import { TelegramBotService } from '../src/services/telegram-bot.service';
import type { TelegramApiClient } from '../src/services/telegram-api.client';

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
}));

jest.mock('../src/utils/logger');

describe('TelegramBotService', () => {
  const mockedCompressPdf = compressPdf as jest.MockedFunction<typeof compressPdf>;
  let apiClient: jest.Mocked<TelegramApiClient>;
  let service: TelegramBotService;

  beforeEach(() => {
    apiClient = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      sendChatAction: jest.fn().mockResolvedValue(undefined),
      getFile: jest.fn().mockResolvedValue({
        file_id: 'file-id',
        file_unique_id: 'unique-id',
        file_size: 11,
        file_path: 'documents/test.pdf',
      }),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4\nmock')),
      sendDocument: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TelegramApiClient>;

    mockedCompressPdf.mockReset();
    service = new TelegramBotService({ apiClient, maxFileBytes: 1024 * 1024 });
  });

  test('responds to /start with usage instructions', async () => {
    await service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        chat: { id: 123, type: 'private' },
        text: '/start',
      },
    });

    expect(apiClient.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('I compress PDF files'),
      10,
    );
    expect(mockedCompressPdf).not.toHaveBeenCalled();
  });

  test('compresses PDF documents and sends the compressed PDF back', async () => {
    const compressedPdf = Buffer.from('%PDF-1.4\ncompressed');
    mockedCompressPdf.mockResolvedValue({
      data: compressedPdf,
      stats: {
        originalSize: 100,
        compressedSize: 60,
        reductionPercent: 40,
        compressionRatio: '40.0%',
        algorithm: PdfCompressionAlgorithm.Smallest,
        quality: PdfCompressionQuality.Medium,
        pagesProcessed: 1,
        processingTimeMs: 25,
        outputFilename: 'source_smallest.pdf',
      },
    });

    await service.handleUpdate({
      update_id: 2,
      message: {
        message_id: 11,
        chat: { id: 456, type: 'private' },
        document: {
          file_id: 'file-id',
          file_unique_id: 'unique-id',
          file_name: 'source.pdf',
          mime_type: 'application/pdf',
          file_size: 100,
        },
      },
    });

    expect(apiClient.getFile).toHaveBeenCalledWith('file-id');
    expect(apiClient.downloadFile).toHaveBeenCalledWith('documents/test.pdf');
    expect(mockedCompressPdf).toHaveBeenCalledWith(
      Buffer.from('%PDF-1.4\nmock'),
      expect.objectContaining({
        algorithm: PdfCompressionAlgorithm.Smallest,
        quality: PdfCompressionQuality.Medium,
        filename: 'source.pdf',
      }),
    );
    expect(apiClient.sendDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 456,
        document: compressedPdf,
        filename: 'source_smallest.pdf',
        caption: expect.stringContaining('Compressed PDF ready'),
        replyToMessageId: 11,
      }),
    );
  });

  test('rejects non-PDF documents without downloading them', async () => {
    await service.handleUpdate({
      update_id: 3,
      message: {
        message_id: 12,
        chat: { id: 789, type: 'private' },
        document: {
          file_id: 'file-id',
          file_unique_id: 'unique-id',
          file_name: 'notes.txt',
          mime_type: 'text/plain',
          file_size: 100,
        },
      },
    });

    expect(apiClient.sendMessage).toHaveBeenCalledWith(
      789,
      expect.stringContaining('does not look like a PDF'),
      12,
    );
    expect(apiClient.getFile).not.toHaveBeenCalled();
    expect(mockedCompressPdf).not.toHaveBeenCalled();
  });

  test('rejects oversized documents before downloading them', async () => {
    service = new TelegramBotService({ apiClient, maxFileBytes: 50 });

    await service.handleUpdate({
      update_id: 4,
      message: {
        message_id: 13,
        chat: { id: 111, type: 'private' },
        document: {
          file_id: 'file-id',
          file_unique_id: 'unique-id',
          file_name: 'large.pdf',
          mime_type: 'application/pdf',
          file_size: 100,
        },
      },
    });

    expect(apiClient.sendMessage).toHaveBeenCalledWith(
      111,
      expect.stringContaining('too large'),
      13,
    );
    expect(apiClient.getFile).not.toHaveBeenCalled();
    expect(mockedCompressPdf).not.toHaveBeenCalled();
  });

  test('guides unsupported messages toward sending a PDF', async () => {
    await service.handleUpdate({
      update_id: 5,
      message: {
        message_id: 14,
        chat: { id: 222, type: 'private' },
      },
    });

    expect(apiClient.sendMessage).toHaveBeenCalledWith(
      222,
      expect.stringContaining('Send me a PDF'),
      14,
    );
  });
});
