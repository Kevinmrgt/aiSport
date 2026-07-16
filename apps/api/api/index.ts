import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../src/app.js';

function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function getFirstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function createRequestHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }

  return headers;
}

function createRequestUrl(req: IncomingMessage): string {
  const protocol = getFirstHeader(req.headers['x-forwarded-proto']) ?? 'https';
  const host =
    getFirstHeader(req.headers['x-forwarded-host']) ?? getFirstHeader(req.headers['host']) ?? 'localhost';

  return new URL(req.url ?? '/', `${protocol}://${host}`).toString();
}

async function writeResponse(response: Response, res: ServerResponse): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  res.end(Buffer.from(await response.arrayBuffer()));
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const method = req.method ?? 'GET';
  const requestInit: RequestInit = {
    method,
    headers: createRequestHeaders(req),
  };

  if (method !== 'GET' && method !== 'HEAD') {
    requestInit.body = (await readRawBody(req)) as unknown as BodyInit;
  }

  const response = await app.fetch(new Request(createRequestUrl(req), requestInit));
  await writeResponse(response, res);
}
