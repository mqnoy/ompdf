import request from 'supertest';
import { createExpressApiApp } from '../src/app';
import { telegramBotService } from '../src/services/telegram-bot.service';

jest.mock('../src/services/telegram-bot.service', () => ({
  telegramBotService: {
    handleUpdate: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/utils/logger');

describe('Telegram webhook route', () => {
  const originalEnv = process.env;
  const mockedTelegramBotService = telegramBotService as jest.Mocked<typeof telegramBotService>;

  beforeEach(() => {
    process.env = { ...originalEnv, TELEGRAM_WEBHOOK_SECRET: 'test-secret' };
    mockedTelegramBotService.handleUpdate.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('rejects requests when webhook secret is missing', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;

    const response = await request(createExpressApiApp())
      .post('/api/v1/telegram/webhook')
      .send({ update_id: 1 });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('TELEGRAM_WEBHOOK_NOT_CONFIGURED');
    expect(mockedTelegramBotService.handleUpdate).not.toHaveBeenCalled();
  });

  test('rejects requests with wrong webhook secret', async () => {
    const response = await request(createExpressApiApp())
      .post('/api/v1/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'wrong-secret')
      .send({ update_id: 1 });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TELEGRAM_WEBHOOK_UNAUTHORIZED');
    expect(mockedTelegramBotService.handleUpdate).not.toHaveBeenCalled();
  });

  test('rejects invalid Telegram update payloads', async () => {
    const response = await request(createExpressApiApp())
      .post('/api/v1/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'test-secret')
      .send({ message: { message_id: 10 } });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TELEGRAM_UPDATE_INVALID');
    expect(mockedTelegramBotService.handleUpdate).not.toHaveBeenCalled();
  });

  test('accepts valid updates and dispatches them asynchronously', async () => {
    const update = {
      update_id: 42,
      message: {
        message_id: 7,
        chat: { id: 123, type: 'private' },
        text: '/start',
      },
    };

    const response = await request(createExpressApiApp())
      .post('/api/v1/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'test-secret')
      .send(update);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(mockedTelegramBotService.handleUpdate).toHaveBeenCalledWith(update);
  });
});
