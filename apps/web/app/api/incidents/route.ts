import { BrowserIncidentInputSchema, canonicalBrowserIncidentPath } from '@alcide/shared';
import { auth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';

const MAX_BODY_BYTES = 1_024;
function empty(status = 204) {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      const value = chunk.value;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request): Promise<Response> {
  // Next may expose its internal listener origin behind a reverse proxy. Use the
  // configured public Auth.js origin; never derive trust from forwarded headers.
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(process.env['AUTH_URL'] ?? process.env['NEXTAUTH_URL'] ?? request.url)
      .origin;
  } catch {
    return empty(403);
  }
  if (request.headers.get('origin') !== expectedOrigin) return empty(403);
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    return empty(415);
  const session = await auth();
  if (!session?.user?.id) return empty(401);
  let input;
  try {
    const body = await readBoundedBody(request);
    if (body === null) return empty(413);
    input = BrowserIncidentInputSchema.safeParse(JSON.parse(body));
  } catch {
    return empty(400);
  }
  if (!input.success) return empty(400);
  try {
    await serverFetch<void>(
      '/incidents',
      {
        method: 'POST',
        body: JSON.stringify({
          kind: input.data.kind,
          path: canonicalBrowserIncidentPath(input.data.path),
        }),
      },
      2_000,
    );
  } catch {
    // Do not collect collection failures, expose service errors or retry them.
  }
  return empty();
}
