import 'server-only';
import { auth } from '@/lib/auth';
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
import type { CreateSessionLogInput, SessionLogListItem, SessionLogStats } from '@alcide/shared';

export interface UserAiSettings {
  provider: 'openai';
  hasApiKey: boolean;
  model: string | null;
}

export interface SaveAiSettingsInput {
  model?: string;
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
async function serverFetch<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifie');
  }

  // OWASP A09: trace structuree de chaque appel API cote Next.js server
  console.info('[ServerAPI] Appel:', {
    method: options?.method ?? 'GET',
    path,
    userId: session.user.id,
    apiUrl: API_URL,
    timestamp: new Date().toISOString(),
  });

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const abortFromCaller = () => timeoutController.abort();
  options?.signal?.addEventListener('abort', abortFromCaller, { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: timeoutController.signal,
      headers: {
        'Content-Type': 'application/json',
        // OWASP A01: secret partage valide par le middleware Hono
        'x-internal-secret': process.env['SERVICE_SECRET'] ?? '',
        'x-user-id': session.user.id,
        'x-user-email': session.user.email ?? '',
        'x-user-name': session.user.name ?? '',
        ...(options?.headers as Record<string, string>),
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
    // OWASP A09: logger l'erreur API complete cote Next.js server (visible dans les logs Vercel)
    console.error('[ServerAPI] Erreur reponse API:', {
      url: `${API_URL}${path}`,
      status: response.status,
      statusText: response.statusText,
      apiError: err,
      timestamp: new Date().toISOString(),
    });
    throw new ServerApiError(err.message ?? `Erreur API: ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

export const serverApi = {
  generateWorkout: (input: GenerateWorkoutInput): Promise<WorkoutDetail> =>
    serverFetch<WorkoutDetail>(
      '/workouts/generate',
      {
        method: 'POST',
        body: JSON.stringify(input),
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

  generateProgram: (input: GenerateProgramInput): Promise<ProgramListItem> =>
    serverFetch<ProgramListItem>(
      '/programs/generate',
      {
        method: 'POST',
        body: JSON.stringify(input),
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
};
