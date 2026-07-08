/**
 * Minimal Telegram Bot API client.
 *
 * Do not log bot tokens, file URLs, or raw Telegram payloads here.
 */

import type { TelegramFile } from '../types/telegram';

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface TelegramApiClientOptions {
  token?: string;
  apiBaseUrl?: string;
  fileBaseUrl?: string;
}

export interface SendDocumentOptions {
  chatId: number;
  document: Buffer;
  filename: string;
  caption?: string;
  replyToMessageId?: number;
}

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'TelegramApiError';
  }
}

export class TelegramApiClient {
  private readonly token: string;
  private readonly apiBaseUrl: string;
  private readonly fileBaseUrl: string;

  constructor(options: TelegramApiClientOptions = {}) {
    this.token = options.token ?? process.env.TELEGRAM_BOT_TOKEN ?? '';
    this.apiBaseUrl = options.apiBaseUrl ?? 'https://api.telegram.org';
    this.fileBaseUrl = options.fileBaseUrl ?? 'https://api.telegram.org/file';
  }

  async sendMessage(chatId: number, text: string, replyToMessageId?: number): Promise<void> {
    await this.call('sendMessage', {
      chat_id: chatId,
      text,
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    });
  }

  async sendChatAction(chatId: number, action: 'typing' | 'upload_document'): Promise<void> {
    await this.call('sendChatAction', {
      chat_id: chatId,
      action,
    });
  }

  async getFile(fileId: string): Promise<TelegramFile> {
    return this.call<TelegramFile>('getFile', { file_id: fileId });
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    this.assertConfigured();

    const url = `${this.fileBaseUrl}/bot${this.token}/${filePath}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new TelegramApiError('Telegram file download failed', response.status);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async sendDocument(options: SendDocumentOptions): Promise<void> {
    this.assertConfigured();

    const form = new FormData();
    form.set('chat_id', options.chatId.toString());
    form.set(
      'document',
      new Blob([new Uint8Array(options.document)], { type: 'application/pdf' }),
      options.filename,
    );

    if (options.caption) {
      form.set('caption', options.caption);
    }
    if (options.replyToMessageId) {
      form.set('reply_to_message_id', options.replyToMessageId.toString());
    }

    await this.callWithForm('sendDocument', form);
  }

  private async call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    this.assertConfigured();

    const response = await fetch(`${this.apiBaseUrl}/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return this.parseResponse<T>(response);
  }

  private async callWithForm<T>(method: string, form: FormData): Promise<T> {
    this.assertConfigured();

    const response = await fetch(`${this.apiBaseUrl}/bot${this.token}/${method}`, {
      method: 'POST',
      body: form,
    });

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    let payload: TelegramApiResponse<T> | undefined;
    try {
      payload = (await response.json()) as TelegramApiResponse<T>;
    } catch {
      // Telegram normally returns JSON; keep error generic to avoid leaking details.
    }

    if (!response.ok || !payload?.ok) {
      throw new TelegramApiError(payload?.description ?? 'Telegram API request failed', response.status);
    }

    return payload.result as T;
  }

  private assertConfigured(): void {
    if (!this.token) {
      throw new TelegramApiError('TELEGRAM_BOT_TOKEN is not configured');
    }
  }
}
