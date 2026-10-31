import 'server-only';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasProductionAccess } from '@/lib/access-policy';
import type {
  WorkoutDetail,
  WorkoutListResponse,
  WorkoutStats,
  GenerateWorkoutInput,
} from '@alcide/shared';
import type {
  GenerateProgramInput,
  ProgramListResponse,
  TrainingProgramRecord,
  ProgramListItem,
} from '@alcide/shared';
import type { GenerationQuota, BillingStatus } from '@alcide/shared';
import type { CreateSessionLogInput, SessionLogListItem, SessionLogStats } from '@alcide/shared';

export interface UserAiSettings {
  provider: 'openai';
  hasApiKey: boolean;
  model: string | null;
}

export interface SaveAiSettingsInput {
  model?: string;
}

export interface BetaTesterSummary {
  userId: string;
  name: string | null;
  email: string;
  active: boolean;
  generationBalance: number;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AdminOverview {
  stats: {
    totalUsers: number;
    betaTesterCount: number;
    activeBetaTesterCount: number;
    pendingPasswordChangeCount: number;
    availableGenerations: number;
    workoutCount: number;
    programCount: number;
    completedSessionCount: number;
    newUsersLast30Days: number;
  };
  analytics: {
    daily: Array<{
      date: string;
      newUsers: number;
      workouts: number;
      programs: number;
      completedSessions: number;
      visits: number;
    }>;
    sportActivity: Array<{
      date: string;
      sport: string;
      workouts: number;
      completedSessions: number;
    }>;
  };
  settings: {
    defaultAiModel: string;
    defaultBetaGenerationBalance: number;
  };
  availableModels: Array<{ id: string; label: string }>;
}

// API_URL utilise le réseau interne en Docker. Le fallback public conserve la
// compatibilité avec les environnements Vercel déjà configurés.
const API_URL =
  process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const DEFAULT_TIMEOUT_MS = 15_000;
const GENERATION_TIMEOUT_MS = 120_000;

export class ServerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ServerApiError';
  }
}

export function isServerApiNotFound(error: unknown): error is ServerApiError {
  return error instanceof ServerApiError && error.status === 404;
}

// Helper interne - appel Hono avec auth service-to-service (OWASP A01)
// Le secret n'est jamais expose cote client : ce module est server-only
export async function serverFetch<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifie');
  }
  if (!hasProductionAccess(session.user)) {
    throw new ServerApiError('Accès réservé à l’administration.', 403, 'ACCESS_RESTRICTED');
  }

  const authMethod = session.user.authMethod === 'beta' ? 'beta' : 'standard';
  if (
    authMethod === 'beta' &&
    session.user.betaMustChangePassword &&
    !['/auth/beta/password', '/account/status', '/account', '/account/export'].includes(path)
  ) {
    redirect('/change-password');
  }
  const requestId = crypto.randomUUID();
  // Correlate services without logging account data, filters or payloads.
  console.info('[ServerAPI] Appel:', {
    method: options?.method ?? 'GET',
    requestId,
  });

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const abortFromCaller = () => timeoutController.abort();
  options?.signal?.addEventListener('abort', abortFromCaller, { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      cache: 'no-store',
      signal: timeoutController.signal,
      headers: {
        ...(options?.headers as Record<string, string>),
        'Content-Type': 'application/json',
        // OWASP A01: secret partage valide par le middleware Hono
        'x-internal-secret': process.env['SERVICE_SECRET'] ?? '',
        'x-user-id': session.user.id,
        'x-user-email': session.user.email ?? '',
        'x-email-verified': session.user.googleEmailVerified === true ? 'true' : 'false',
        'x-user-name-encoded': encodeURIComponent(
          new TextDecoder()
            .decode(new TextEncoder().encode((session.user.name ?? '').slice(0, 256)))
            .split('')
            .map((character) =>
              character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character,
            )
            .join(''),
        ),
        'x-request-id': requestId,
        'x-auth-method': authMethod,
        ...(authMethod === 'beta' && session.user.betaSessionVersion
          ? { 'x-beta-session-version': session.user.betaSessionVersion }
          : {}),
        'x-auth-issued-at': String(session.user.authIssuedAt ?? ''),
      },
    });
  } catch (error) {
    if (timeoutController.signal.aborted && !options?.signal?.aborted) {
      throw new ServerApiError(
        `Le service Alcide n'a pas repondu sous ${timeoutMs / 1000} secondes.`,
        504,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener('abort', abortFromCaller);
  }

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      statusCode?: number;
    };
    if (err.error === 'ACCOUNT_SUSPENDED') redirect('/compte-suspendu');
    // OWASP A09: logger l'erreur API complete cote Next.js server (visible dans les logs Vercel)
    console.error('[ServerAPI] Erreur reponse API:', {
      requestId,
      status: response.status,
    });
    throw new ServerApiError(
      err.message ?? `Erreur API: ${response.status}`,
      response.status,
      err.error,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const serverApi = {
  getBillingStatus: (): Promise<BillingStatus> => serverFetch<BillingStatus>('/billing/status'),
  createCheckout: (): Promise<{ url: string }> =>
    serverFetch('/billing/checkout', { method: 'POST' }, 55_000),
  createBillingPortal: (): Promise<{ url: string }> =>
    serverFetch('/billing/portal', { method: 'POST' }, 30_000),
  syncCheckout: (sessionId: string): Promise<{ ok: true }> =>
    serverFetch('/billing/sync', { method: 'POST', body: JSON.stringify({ sessionId }) }, 55_000),
  getGenerationQuota: (): Promise<GenerationQuota> =>
    serverFetch<GenerationQuota>('/generation-quota'),

  generateWorkout: (input: GenerateWorkoutInput, operationId?: string): Promise<WorkoutDetail> =>
    serverFetch<WorkoutDetail>(
      '/workouts/generate',
      {
        method: 'POST',
        body: JSON.stringify(input),
        ...(operationId ? { headers: { 'idempotency-key': operationId } } : {}),
      },
      GENERATION_TIMEOUT_MS,
    ),

  getWorkouts: (params?: {
    page?: number;
    limit?: number;
    sport?: string;
    level?: string;
  }): Promise<WorkoutListResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.sport) qs.set('sport', params.sport);
    if (params?.level) qs.set('level', params.level);
    const query = qs.toString();
    return serverFetch<WorkoutListResponse>(`/workouts${query ? `?${query}` : ''}`);
  },

  getStats: (): Promise<WorkoutStats> => serverFetch<WorkoutStats>('/workouts/stats'),

  getWorkout: (id: string): Promise<WorkoutDetail> => serverFetch<WorkoutDetail>(`/workouts/${id}`),

  deleteWorkout: (id: string): Promise<void> =>
    serverFetch<void>(`/workouts/${id}`, { method: 'DELETE' }),

  // --- Programmes multi-semaines ---

  generateProgram: (input: GenerateProgramInput, operationId?: string): Promise<ProgramListItem> =>
    serverFetch<ProgramListItem>(
      '/programs/generate',
      {
        method: 'POST',
        body: JSON.stringify(input),
        ...(operationId ? { headers: { 'idempotency-key': operationId } } : {}),
      },
      GENERATION_TIMEOUT_MS,
    ),

  getPrograms: (params?: { page?: number; limit?: number }): Promise<ProgramListResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return serverFetch<ProgramListResponse>(`/programs${query ? `?${query}` : ''}`);
  },

  getProgram: (id: string): Promise<TrainingProgramRecord & { createdAt: string }> =>
    serverFetch<TrainingProgramRecord & { createdAt: string }>(`/programs/${id}`),

  deleteProgram: (id: string): Promise<void> =>
    serverFetch<void>(`/programs/${id}`, { method: 'DELETE' }),

  // --- Suivi de seance ---

  createSessionLog: (input: CreateSessionLogInput): Promise<SessionLogListItem> =>
    serverFetch<SessionLogListItem>('/session-logs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getSessionLogStats: (): Promise<SessionLogStats> =>
    serverFetch<SessionLogStats>('/session-logs/stats'),

  getRecentSessionLogs: (limit = 5): Promise<{ sessionLogs: SessionLogListItem[] }> =>
    serverFetch<{ sessionLogs: SessionLogListItem[] }>(`/session-logs/recent?limit=${limit}`),

  // --- Parametres IA ---

  getAiSettings: (): Promise<UserAiSettings> => serverFetch<UserAiSettings>('/settings'),

  saveAiSettings: (input: SaveAiSettingsInput): Promise<{ ok: boolean }> =>
    serverFetch<{ ok: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  changeBetaPassword: (input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ ok: boolean }> =>
    serverFetch<{ ok: boolean }>('/auth/beta/password', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  listBetaTesters: (): Promise<{ betaTesters: BetaTesterSummary[] }> =>
    serverFetch<{ betaTesters: BetaTesterSummary[] }>('/admin/beta-testers'),

  getAdminOverview: (): Promise<AdminOverview> => serverFetch<AdminOverview>('/admin/overview'),

  savePlatformSettings: (
    input: AdminOverview['settings'],
  ): Promise<{ settings: AdminOverview['settings'] }> =>
    serverFetch<{ settings: AdminOverview['settings'] }>('/admin/platform-settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  createBetaTester: (input: {
    name: string;
    email: string;
    generationBalance: number;
  }): Promise<BetaTesterSummary & { temporaryPassword: string }> =>
    serverFetch<BetaTesterSummary & { temporaryPassword: string }>('/admin/beta-testers', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  adjustBetaCredits: (userId: string, amount: number): Promise<{ generationBalance: number }> =>
    serverFetch<{ generationBalance: number }>(`/admin/beta-testers/${userId}/credits`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  setBetaStatus: (userId: string, active: boolean): Promise<{ ok: boolean }> =>
    serverFetch<{ ok: boolean }>(`/admin/beta-testers/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),

  resetBetaPassword: (userId: string): Promise<{ temporaryPassword: string }> =>
    serverFetch<{ temporaryPassword: string }>(`/admin/beta-testers/${userId}/password-reset`, {
      method: 'POST',
    }),

  deleteBetaTester: (userId: string): Promise<{ ok: boolean }> =>
    serverFetch<{ ok: boolean }>(`/admin/beta-testers/${userId}`, { method: 'DELETE' }),

  exportAccount: (): Promise<unknown> => serverFetch<unknown>('/account/export'),

  deleteAccount: (): Promise<{ ok: boolean }> =>
    serverFetch<{ ok: boolean }>('/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'SUPPRIMER' }),
    }),
};
