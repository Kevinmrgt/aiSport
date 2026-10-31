import { z } from 'zod';

export const IncidentSourceSchema = z.enum(['api', 'ai', 'web']);
export const IncidentSeveritySchema = z.enum(['warning', 'error', 'critical']);
export const IncidentStatusSchema = z.enum(['new', 'in_progress', 'resolved']);
export type IncidentSource = z.infer<typeof IncidentSourceSchema>;
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export const UpdateIncidentStatusSchema = z.object({ status: IncidentStatusSchema }).strict();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  });
export const AdminIncidentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    q: z.string().trim().max(150).optional(),
    from: date.optional(),
    to: date.optional(),
    source: IncidentSourceSchema.optional(),
    severity: IncidentSeveritySchema.optional(),
    status: IncidentStatusSchema.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'La date de début doit précéder la date de fin.',
    path: ['to'],
  });
export type AdminIncidentQuery = z.infer<typeof AdminIncidentQuerySchema>;
export const BrowserIncidentInputSchema = z
  .object({
    kind: z.enum(['react_boundary', 'unhandled_error', 'unhandled_rejection']),
    path: z.string().min(1).max(2048),
  })
  .strict();
export type BrowserIncidentInput = z.infer<typeof BrowserIncidentInputSchema>;

// Exact product paths only: never retain arbitrary segments, IDs, queries or fragments.
const browserRoutes = [
  '/',
  '/login',
  '/change-password',
  '/compte-suspendu',
  '/conditions',
  '/confidentialite',
  '/mentions-legales',
  '/tarifs',
  '/abonnement',
  '/dashboard',
  '/generate',
  '/workouts',
  '/workouts/:id',
  '/programs',
  '/programs/generate',
  '/programs/:id',
  '/programs/:id/sessions/:sessionId',
  '/settings',
  '/admin',
  '/admin/statistiques',
  '/admin/beta',
  '/admin/beta/nouveau',
  '/admin/credits',
  '/admin/membres',
  '/admin/membres/:id',
  '/admin/abonnements',
  '/admin/seances',
  '/admin/seances/:id',
  '/admin/programmes',
  '/admin/programmes/:id',
  '/admin/configuration/modeles',
  '/admin/configuration/plateforme',
  '/admin/journal',
  '/admin/erreurs',
];
export function canonicalBrowserIncidentPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/unknown';
  const path = value.split(/[?#]/, 1)[0]!.replace(/\/$/, '') || '/';
  if (browserRoutes.includes(path)) return path;
  return (
    browserRoutes.find(
      (template) =>
        template.includes(':') &&
        new RegExp(`^${template.replace(/:[A-Za-z]+/g, '[^/]+')}$`).test(path),
    ) ?? '/unknown'
  );
}
export interface AdminIncident {
  id: string;
  fingerprint: string;
  source: IncidentSource;
  severity: IncidentSeverity;
  code: string;
  route: string;
  method: string;
  statusCode: number | null;
  lastRequestId: string | null;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: IncidentStatus;
}
