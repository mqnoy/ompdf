/**
 * Server entry point
 */

import { createExpressApiApp } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  const app = createExpressApiApp();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 OMPDF Express API running on http://localhost:${PORT}`);
    logger.info(`📖 Swagger UI available at http://localhost:${PORT}/api-docs`);
    logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
  });

  const shutdown = (signal: string) => {
    logger.info(`[Server] Received ${signal}, shutting down...`);
    server.close(() => {
      logger.info('[Server] HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('[Server] Fatal startup error', err);
  process.exit(1);
});
