import { handle } from '@hono/node-server/vercel';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../src/app.js';

// Pre-read the request body as a Buffer before handing off to Hono.
// @hono/node-server/vercel checks for `rawBody` first and uses a simple
// buffered ReadableStream when present. Without this, Readable.toWeb(incoming)
// hangs in Vercel's Lambda environment because the body stream is paused
// and never emits data through the Web API ReadableStream adapter.
function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const honoHandler = handle(app);

export default async function handler(
  req: IncomingMessage & { rawBody?: Buffer },
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.rawBody === undefined) {
    req.rawBody = await readRawBody(req);
  }
  return honoHandler(req, res);
}
