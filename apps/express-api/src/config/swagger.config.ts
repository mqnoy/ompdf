/**
 * Swagger / OpenAPI 3.0 specification
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OMPDF Express API',
      version: '0.1.0',
      description: `
Express application wrapper around the **ompdf** compression library.

### Algorithms

| Algorithm | Strategy | Interactivity |
|-----------|----------|---------------|
| **smallest** | Tries multiple strategies and returns the smallest valid PDF | Depends on selected winner |
| **mutool** | MuPDF WebAssembly structure optimisation | ✅ Preserved |
| **ghostscript** | Ghostscript WebAssembly pdfwrite optimisation | ✅ Preserved |
| **standard** | Re-encodes images + deflates streams | ✅ Preserved |
| **condense** | Structure-only garbage-collect + deflate | ✅ Fully preserved |
| **photon** | Rasterises every page → JPEG/PNG → new PDF | ❌ Lost |
      `,
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local dev server' }],
    components: {
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            uptime: { type: 'number', example: 12.34 },
            timestamp: { type: 'string', format: 'date-time' },
            service: { type: 'string', example: 'express-api' },
          },
        },
        CompressRequest: {
          type: 'object',
          required: ['file'],
          properties: {
            file: { type: 'string', format: 'binary' },
            algorithm: {
              type: 'string',
              enum: ['smallest', 'mutool', 'ghostscript', 'standard', 'condense', 'photon'],
              default: 'smallest',
            },
            strategy: {
              type: 'string',
              enum: ['smallest', 'mutool', 'ghostscript', 'standard', 'condense', 'photon'],
              description: 'Alias for algorithm',
            },
            quality: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'maximum'],
              default: 'medium',
            },
            removeMetadata: { type: 'string', example: 'true' },
            optimizeImages: { type: 'string', example: 'false' },
            photonDpi: { type: 'integer', minimum: 36, maximum: 600, default: 150 },
            photonFormat: { type: 'string', enum: ['jpeg', 'png'], default: 'jpeg' },
            photonQuality: { type: 'integer', minimum: 1, maximum: 100, default: 85 },
            ghostscriptPreset: {
              type: 'string',
              enum: ['screen', 'ebook', 'printer', 'prepress', 'default'],
            },
            ghostscriptCompatibilityLevel: {
              type: 'string',
              enum: ['1.4', '1.5', '1.6', '1.7'],
              default: '1.4',
            },
            ghostscriptColorImageResolution: { type: 'integer', minimum: 1, maximum: 2400 },
            ghostscriptGrayImageResolution: { type: 'integer', minimum: 1, maximum: 2400 },
            ghostscriptMonoImageResolution: { type: 'integer', minimum: 1, maximum: 2400 },
            ghostscriptDownsampleImages: { type: 'string', example: 'true' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INVALID_ALGORITHM' },
                message: { type: 'string', example: 'algorithm must be one of: smallest, mutool' },
              },
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          operationId: 'healthCheck',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/compress': {
        post: {
          tags: ['Compression'],
          summary: 'Compress a PDF file',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: { $ref: '#/components/schemas/CompressRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Compressed PDF binary with metadata headers',
              headers: {
                'X-Compression-Algorithm': { schema: { type: 'string' } },
                'X-Original-Size': { schema: { type: 'string' } },
                'X-Compressed-Size': { schema: { type: 'string' } },
                'X-Compression-Ratio': { schema: { type: 'string' } },
                'X-Pages-Processed': { schema: { type: 'string' } },
              },
              content: {
                'application/pdf': {
                  schema: { type: 'string', format: 'binary' },
                },
              },
            },
            '400': {
              description: 'Invalid request parameters',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            '415': {
              description: 'Unsupported media type',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            '422': {
              description: 'Invalid PDF structure',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            '500': {
              description: 'Internal server error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
          },
        },
      },
      '/api/v1/compress/info': {
        get: {
          tags: ['Compression'],
          summary: 'List supported compression algorithms',
          responses: {
            '200': {
              description: 'Algorithm metadata',
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
