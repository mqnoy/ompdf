/**
 * Telegram webhook controller.
 */

import type { Request, Response } from 'express';
import type { TelegramUpdate } from '../types/telegram';
import { logger } from '../utils/logger';
import { telegramBotService, type TelegramBotService } from '../services/telegram-bot.service';

export class TelegramController {
  constructor(private readonly botService: TelegramBotService = telegramBotService) {}

  webhook(req: Request, res: Response): void {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expectedSecret) {
      logger.error('[TelegramController] TELEGRAM_WEBHOOK_SECRET is not configured');
      res.status(503).json({
        success: false,
        error: {
          code: 'TELEGRAM_WEBHOOK_NOT_CONFIGURED',
          message: 'Telegram webhook is not configured.',
        },
      });
      return;
    }

    const actualSecret = req.get('x-telegram-bot-api-secret-token');
    if (actualSecret !== expectedSecret) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TELEGRAM_WEBHOOK_UNAUTHORIZED',
          message: 'Invalid Telegram webhook secret.',
        },
      });
      return;
    }

    const update = req.body as TelegramUpdate;
    if (!isTelegramUpdate(update)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TELEGRAM_UPDATE_INVALID',
          message: 'Invalid Telegram update payload.',
        },
      });
      return;
    }

    res.status(200).json({ ok: true });

    void this.botService.handleUpdate(update).catch((err) => {
      logger.error('[TelegramController] Async Telegram update handling failed', {
        updateId: update.update_id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

export const telegramController = new TelegramController();

function isTelegramUpdate(value: unknown): value is TelegramUpdate {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { update_id?: unknown }).update_id === 'number'
  );
}
