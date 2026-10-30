import { randomUUID } from 'node:crypto';

export function requestId(value?: string): string {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : randomUUID();
}

export function logFailure(
  event: string,
  details: { requestId?: string; code?: string; statusCode?: number; errorName?: string },
): void {
  // Only these fields may cross the log boundary. Never spread exception objects.
  console.error(event, {
    requestId: details.requestId,
    code: details.code,
    statusCode: details.statusCode,
    errorName: details.errorName,
  });
}

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}
