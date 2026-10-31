import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import {
  canonicalBrowserIncidentPath,
  type IncidentSource,
  type IncidentSeverity,
} from '@alcide/shared';
import type { Context, Next } from 'hono';

export interface IncidentInput {
  source: IncidentSource;
  severity: IncidentSeverity;
  code: string;
  route: string;
  method: string;
  statusCode: number | null;
  lastRequestId: string | null;
  fingerprint: string;
}
interface RequestIncidents {
  route: string;
  method: string;
  requestId?: string;
  pending: Map<string, IncidentInput>;
}
const scope = new AsyncLocalStorage<RequestIncidents>();
const codes = new Set([
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'DB_WRITE_FAILED',
  'STORED_DATA_INVALID',
  'SETTINGS_WRITE_FAILED',
  'PLATFORM_SETTINGS_WRITE_FAILED',
  'QUOTA_RELEASE_FAILED',
  'OPERATION_FINALIZATION_FAILED',
  'CREDIT_RELEASE_FAILED',
  'FINAL_VALIDATION_FAILED',
  'AI_PROVIDER_ERROR',
  'AI_ACCOUNTING_ERROR',
  'AI_TIMEOUT',
  'AI_NETWORK_ERROR',
  'AI_RESPONSE_INVALID',
  'WEB_REACT_BOUNDARY',
  'WEB_UNHANDLED_ERROR',
  'WEB_UNHANDLED_REJECTION',
]);
const apiRoutes = [
  '/health',
  '/health/ready',
  '/account',
  '/account/export',
  '/account/status',
  '/generation-quota',
  '/auth/beta/login',
  '/auth/beta/password',
  '/analytics/visits',
  '/incidents',
  '/workouts',
  '/workouts/generate',
  '/workouts/stats',
  '/workouts/:id',
  '/programs',
  '/programs/generate',
  '/programs/:id',
  '/settings',
  '/session-logs',
  '/session-logs/recent',
  '/session-logs/stats',
  '/billing/status',
  '/billing/webhook',
  '/billing/checkout',
  '/billing/portal',
  '/billing/sync',
  ...[
    'summary',
    'analytics',
    'members',
    'members/:id',
    'members/:id/suspension',
    'members/:id/credits',
    'subscriptions',
    'credits',
    'audit',
    'workouts',
    'workouts/:id',
    'programs',
    'programs/:id',
    'platform-settings',
    'overview',
    'beta-testers',
    'beta-testers/:id',
    'beta-testers/:id/credits',
    'beta-testers/:id/status',
    'beta-testers/:id/password-reset',
    'incidents',
    'incidents/:id',
  ].map((path) => `/admin/${path}`),
];
export function canonicalApiIncidentRoute(value: string): string {
  const path = value.split(/[?#]/, 1)[0]!.replace(/\/$/, '') || '/';
  if (apiRoutes.includes(path)) return path;
  return (
    apiRoutes.find(
      (template) =>
        template.includes(':') &&
        new RegExp(`^${template.replace(/:[A-Za-z]+/g, '[^/]+')}$`).test(path),
    ) ?? '/unknown'
  );
}

export function sanitizeIncident(input: Partial<IncidentInput>): IncidentInput {
  const source = input.source === 'web' ? 'web' : input.source === 'ai' ? 'ai' : 'api';
  const code = input.code && codes.has(input.code) ? input.code : 'INTERNAL_ERROR';
  const route =
    source === 'web'
      ? canonicalBrowserIncidentPath(input.route ?? '')
      : canonicalApiIncidentRoute(input.route ?? '');
  const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'BROWSER'].includes(
    input.method ?? '',
  )
    ? input.method!
    : 'UNKNOWN';
  const statusCode =
    Number.isInteger(input.statusCode) && input.statusCode! >= 100 && input.statusCode! <= 599
      ? input.statusCode!
      : null;
  const lastRequestId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.lastRequestId ?? '',
    )
      ? input.lastRequestId!
      : null;
  const severity =
    input.severity === 'critical' || input.severity === 'warning' ? input.severity : 'error';
  return {
    source,
    code,
    route,
    method,
    statusCode,
    lastRequestId,
    severity,
    fingerprint: createHash('sha256')
      .update(JSON.stringify([source, code, route, method, statusCode]))
      .digest('hex'),
  };
}

// No waiting queue: at most two writes per process. Saturation and DB errors drop telemetry.
// Awaiting accepted writes before the HTTP response also works on serverless runtimes.
export function createIncidentWriter(persist: (input: IncidentInput) => Promise<void>, limit = 2) {
  let active = 0;
  return async (input: IncidentInput): Promise<void> => {
    if (active >= limit) return;
    active++;
    try {
      await persist(sanitizeIncident(input));
    } catch {
      /* fail open; never recursively log DB errors */
    } finally {
      active--;
    }
  };
}
const write = createIncidentWriter(async (input) => {
  const { recordIncident } = await import('../repositories/incident.repository.js');
  await recordIncident(input);
});

export function captureIncident(input: Partial<IncidentInput>): void {
  const current = scope.getStore();
  // Only request-scoped work has an awaited lifecycle on serverless. Standalone
  // tooling keeps its console diagnostics instead of starting detached DB writes.
  if (!current) return;
  const incident = sanitizeIncident({
    route: current?.route ?? '/unknown',
    method: current?.method ?? 'UNKNOWN',
    lastRequestId: current?.requestId ?? null,
    ...input,
  });
  if (current.pending.size < 8) current.pending.set(incident.fingerprint, incident);
}
export function captureFailure(details: {
  code?: string;
  statusCode?: number;
  requestId?: string;
}): void {
  if (details.statusCode !== undefined && details.statusCode < 500) return;
  const current = scope.getStore();
  // A precise internal failure already describes this request; don't add its generic wrapper.
  if (
    current?.pending.size &&
    ['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE'].includes(details.code ?? '')
  )
    return;
  captureIncident({
    source:
      details.code?.startsWith('AI_') || details.code === 'FINAL_VALIDATION_FAILED' ? 'ai' : 'api',
    code: details.code ?? 'INTERNAL_ERROR',
    statusCode: details.statusCode ?? 500,
    ...(details.requestId ? { lastRequestId: details.requestId } : {}),
  });
}
export async function incidentMiddleware(ctx: Context, next: Next): Promise<void> {
  const current: RequestIncidents = {
    route: canonicalApiIncidentRoute(ctx.req.path),
    method: ctx.req.method,
    requestId: ctx.get('requestId'),
    pending: new Map(),
  };
  await scope.run(current, async () => {
    try {
      await next();
    } finally {
      if (ctx.res.status >= 500 && current.pending.size === 0)
        captureFailure({ code: 'INTERNAL_ERROR', statusCode: ctx.res.status });
      await Promise.all([...current.pending.values()].map(write));
    }
  });
}

export async function recordBrowserIncident(
  kind: 'react_boundary' | 'unhandled_error' | 'unhandled_rejection',
  path: string,
  requestId?: string,
): Promise<void> {
  const code = {
    react_boundary: 'WEB_REACT_BOUNDARY',
    unhandled_error: 'WEB_UNHANDLED_ERROR',
    unhandled_rejection: 'WEB_UNHANDLED_REJECTION',
  }[kind];
  await write(
    sanitizeIncident({
      source: 'web',
      code,
      route: path,
      method: 'BROWSER',
      lastRequestId: requestId ?? null,
    }),
  );
}
