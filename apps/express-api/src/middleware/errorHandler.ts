/**
 * Error handling middleware
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`[errorHandler] Unhandled error: ${err.message}`, { stack: err.stack });

  const status = (err as Error & { status?: number }).status ?? 500;

  res.status(status).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred.',
    },
  });
}
