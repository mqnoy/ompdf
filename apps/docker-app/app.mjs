import { createServer } from 'node:http';
import { compressPdf } from 'ompdf';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const maxInputBytes = 25 * 1024 * 1024;
const algorithms = new Set([
  'standard',
  'condense',
  'mutool',
  'ghostscript',
  'photon',
]);

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxInputBytes) {
      throw Object.assign(new Error('PDF exceeds the 25 MiB example limit'), {
        statusCode: 413,
      });
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (request.method !== 'POST' || url.pathname !== '/compress') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  const algorithm = url.searchParams.get('algorithm') ?? 'standard';
  if (!algorithms.has(algorithm)) {
    sendJson(response, 400, {
      error: `Unsupported algorithm: ${algorithm}`,
      supportedAlgorithms: [...algorithms],
    });
    return;
  }

  try {
    const input = await readBody(request);
    if (input.length < 5 || input.subarray(0, 5).toString('ascii') !== '%PDF-') {
      sendJson(response, 400, { error: 'Request body must be a PDF' });
      return;
    }

    const result = await compressPdf(input, {
      algorithm,
      filename: 'request.pdf',
    });

    response.writeHead(200, {
      'content-type': 'application/pdf',
      'content-length': String(result.data.length),
      'x-compression-algorithm': result.stats.algorithm,
      'x-original-size': String(result.stats.originalSize),
      'x-compressed-size': String(result.stats.compressedSize),
      'x-pages-processed': String(result.stats.pagesProcessed),
    });
    response.end(result.data);
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    sendJson(response, statusCode, {
      error: error instanceof Error ? error.message : 'Compression failed',
      algorithm,
    });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ompdf Docker example listening on http://0.0.0.0:${port}`);
});

function shutdown() {
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
