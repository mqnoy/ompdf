/**
 * Telegram webhook routes — /api/v1/telegram
 */

import { Router } from 'express';
import { telegramController } from '../controllers/telegram.controller';

const router = Router();

router.post('/webhook', telegramController.webhook.bind(telegramController));

export default router;
