import { canonicalBrowserIncidentPath, type BrowserIncidentInput } from '@alcide/shared';

type IncidentKind = BrowserIncidentInput['kind'];
type IncidentTransport = (input: BrowserIncidentInput) => Promise<unknown>;

// One small budget for the whole document, including React StrictMode remounts.
// Never read an exception, a rejection reason, a stack, a URL query or user data.
export function createIncidentReporter(transport: IncidentTransport, now: () => number = Date.now) {
  const seen = new Map<string, number>();
  let windowStart = 0;
  let count = 0;
  return (kind: IncidentKind, pathname: string): void => {
    try {
      const path = canonicalBrowserIncidentPath(pathname);
      const time = now();
      if (time - windowStart >= 60_000 || time < windowStart) {
        windowStart = time;
        count = 0;
        seen.clear();
      }
      const key = `${kind}:${path}`;
      const last = seen.get(key);
      if (count >= 8 || (last !== undefined && time - last < 30_000)) return;
      seen.set(key, time);
      count++;
      // Consume the budget before sending. Failure must not start retries or loops.
      void transport({ kind, path }).catch(() => undefined);
    } catch {
      // Collection is best effort and must never affect the application.
    }
  };
}

const report = createIncidentReporter(async (input) => {
  await fetch('/api/incidents', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(3_000),
  });
});

export function reportBrowserIncident(kind: IncidentKind): void {
  if (typeof window === 'undefined') return;
  report(kind, window.location.pathname);
}
