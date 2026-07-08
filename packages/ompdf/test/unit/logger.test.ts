import { logger } from '../../src/utils/logger';

describe('logger', () => {
  let consoleSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('info should log to console.log', () => {
    logger.info('test info');
    expect(consoleSpy).toHaveBeenCalled();
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.level).toBe('info');
    expect(output.message).toBe('test info');
  });

  test('warn should log to console.warn', () => {
    logger.warn('test warn');
    expect(warnSpy).toHaveBeenCalled();
    const output = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(output.level).toBe('warn');
  });

  test('error should log to console.error', () => {
    logger.error('test error');
    expect(errorSpy).toHaveBeenCalled();
    const output = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(output.level).toBe('error');
  });

  test('debug should log to console.log', () => {
    logger.debug('test debug');
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('should include metadata if provided', () => {
    const meta = { foo: 'bar' };
    logger.info('test meta', meta);
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.meta).toEqual(meta);
  });
});
