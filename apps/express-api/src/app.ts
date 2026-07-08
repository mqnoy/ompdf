/**
 * Express Application Factory
 */

import express, { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';
import compressionRouter from './routes/compression.routes';
import telegramRouter from './routes/telegram.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

export function createExpressApiApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    logger.info(`→ ${req.method} ${req.path}`);
    next();
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'OMPDF Express API',
      customCss: `
        .topbar { background: #1a1a2e; }
        .swagger-ui .info .title { color: #e94560; }
      `,
    })
  );

  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'express-api',
    });
  });

  app.use('/api/v1/compress', compressionRouter);
  app.use('/api/v1/telegram', telegramRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  app.use(errorHandler);

  return app;
}
