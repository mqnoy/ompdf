/**
 * Telegram bot update handling for PDF compression.
 */

import { compressPdf, PdfCompressionAlgorithm, PdfCompressionQuality } from 'ompdf';
import type { PdfCompressionStats } from 'ompdf';
import type { TelegramDocument, TelegramMessage, TelegramUpdate } from '../types/telegram';
import { logger } from '../utils/logger';
import { TelegramApiClient } from './telegram-api.client';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const DEFAULT_MAX_FILE_BYTES = 20 * 1024 * 1024;

export interface TelegramBotServiceOptions {
  apiClient?: TelegramApiClient;
  maxFileBytes?: number;
}

export class TelegramBotService {
  private readonly apiClient: TelegramApiClient;
  private readonly maxFileBytes: number;

  constructor(options: TelegramBotServiceOptions = {}) {
    this.apiClient = options.apiClient ?? new TelegramApiClient();
    this.maxFileBytes = options.maxFileBytes ?? readMaxFileBytes();
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message) return;

    try {
      if (message.text) {
        await this.handleText(message);
        return;
      }

      if (message.document) {
        await this.handleDocument(message, message.document);
        return;
      }

      await this.apiClient.sendMessage(
        message.chat.id,
        'Send me a PDF as a document and I will compress it for you.',
        message.message_id,
      );
    } catch (err) {
      logger.error('[TelegramBotService] Failed to handle update', safeErrorMeta(err, update));
      await this.notifyFailure(message).catch((notifyErr) => {
        logger.error('[TelegramBotService] Failed to send failure message', safeErrorMeta(notifyErr, update));
      });
    }
  }

  private async handleText(message: TelegramMessage): Promise<void> {
    const command = parseCommand(message.text ?? '');

    if (command === '/start') {
      await this.apiClient.sendMessage(
        message.chat.id,
        [
          'Hi! I compress PDF files.',
          '',
          'Send me a PDF as a Telegram document. I will compress it and send the smaller file back.',
          '',
          'Tip: choose “File” / “Document” when attaching the PDF, not a photo.',
        ].join('\n'),
        message.message_id,
      );
      return;
    }

    if (command === '/help') {
      await this.apiClient.sendMessage(
        message.chat.id,
        [
          'How to use this bot:',
          '1. Attach a PDF as a document.',
          '2. Wait while I compress it.',
          '3. Download the compressed PDF I send back.',
          '',
          `Current upload limit: ${formatBytes(this.maxFileBytes)}.`,
        ].join('\n'),
        message.message_id,
      );
      return;
    }

    await this.apiClient.sendMessage(
      message.chat.id,
      'Send me a PDF as a document and I will compress it for you. Use /help for details.',
      message.message_id,
    );
  }

  private async handleDocument(message: TelegramMessage, document: TelegramDocument): Promise<void> {
    const filename = document.file_name ?? 'document.pdf';

    if (!isPdfDocument(document)) {
      await this.apiClient.sendMessage(
        message.chat.id,
        'That does not look like a PDF. Please send a .pdf file as a document.',
        message.message_id,
      );
      return;
    }

    if (document.file_size && document.file_size > this.maxFileBytes) {
      await this.apiClient.sendMessage(
        message.chat.id,
        `That PDF is too large for this bot. Maximum size is ${formatBytes(this.maxFileBytes)}.`,
        message.message_id,
      );
      return;
    }

    await this.apiClient.sendMessage(message.chat.id, 'Got it — compressing your PDF now…', message.message_id);
    await this.apiClient.sendChatAction(message.chat.id, 'upload_document');

    const file = await this.apiClient.getFile(document.file_id);
    if (!file.file_path) {
      throw new Error('Telegram did not return a downloadable file path');
    }

    if (file.file_size && file.file_size > this.maxFileBytes) {
      await this.apiClient.sendMessage(
        message.chat.id,
        `That PDF is too large for this bot. Maximum size is ${formatBytes(this.maxFileBytes)}.`,
        message.message_id,
      );
      return;
    }

    const pdf = await this.apiClient.downloadFile(file.file_path);
    if (pdf.byteLength > this.maxFileBytes) {
      await this.apiClient.sendMessage(
        message.chat.id,
        `That PDF is too large for this bot. Maximum size is ${formatBytes(this.maxFileBytes)}.`,
        message.message_id,
      );
      return;
    }

    if (!pdf.subarray(0, 4).equals(PDF_MAGIC)) {
      await this.apiClient.sendMessage(
        message.chat.id,
        'The uploaded file does not appear to be a valid PDF.',
        message.message_id,
      );
      return;
    }

    logger.info(
      `[TelegramBotService] Compressing Telegram PDF filename="${filename}" size=${pdf.byteLength}`,
    );

    const { data, stats } = await compressPdf(pdf, {
      algorithm: PdfCompressionAlgorithm.Smallest,
      quality: PdfCompressionQuality.Medium,
      filename,
    });

    await this.apiClient.sendDocument({
      chatId: message.chat.id,
      document: data,
      filename: stats.outputFilename,
      caption: buildResultCaption(stats),
      replyToMessageId: message.message_id,
    });
  }

  private async notifyFailure(message: TelegramMessage): Promise<void> {
    await this.apiClient.sendMessage(
      message.chat.id,
      'Sorry, I could not compress that PDF. Please try another file or try again later.',
      message.message_id,
    );
  }
}

export const telegramBotService = new TelegramBotService();

function parseCommand(text: string): string | undefined {
  const firstToken = text.trim().split(/\s+/)[0];
  if (!firstToken?.startsWith('/')) return undefined;

  return firstToken.split('@')[0].toLowerCase();
}

function isPdfDocument(document: TelegramDocument): boolean {
  const filename = document.file_name?.toLowerCase() ?? '';
  return document.mime_type === 'application/pdf' || filename.endsWith('.pdf');
}

function readMaxFileBytes(): number {
  const raw = process.env.TELEGRAM_MAX_FILE_BYTES;
  if (!raw) return DEFAULT_MAX_FILE_BYTES;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn('[TelegramBotService] Invalid TELEGRAM_MAX_FILE_BYTES; using default');
    return DEFAULT_MAX_FILE_BYTES;
  }

  return parsed;
}

function buildResultCaption(stats: PdfCompressionStats): string {
  return [
    'Compressed PDF ready.',
    `Original: ${formatBytes(stats.originalSize)}`,
    `Compressed: ${formatBytes(stats.compressedSize)}`,
    `Reduction: ${stats.compressionRatio}`,
    `Algorithm: ${stats.algorithm}`,
    `Time: ${stats.processingTimeMs}ms`,
  ].join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KB`;
  return `${(kib / 1024).toFixed(1)} MB`;
}

function safeErrorMeta(err: unknown, update: TelegramUpdate): Record<string, unknown> {
  return {
    updateId: update.update_id,
    messageId: update.message?.message_id,
    error: err instanceof Error ? err.message : String(err),
  };
}
