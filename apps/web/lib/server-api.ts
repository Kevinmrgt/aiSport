import 'server-only';
import { auth } from '@/lib/auth';
import type { WorkoutDetail, WorkoutListResponse, WorkoutStats, GenerateWorkoutInput } from '@sportcoach/shared';
import type { GenerateProgramInput, ProgramListResponse, TrainingProgramRecord, ProgramListItem } from '@sportcoach/shared';
import type {
  CreateSessionLogInput,
  SessionLogListItem,
  SessionLogStats,
} from '@sportcoach/shared';

export interface UserAiSettings {
  provider: 'mistral' | 'openai' | 'anthropic';
  hasApiKey: boolean;
  model: string | null;
}

export interface SaveAiSettingsInput {
  provider: 'mistral' | 'openai' | 'anthropic';
  apiKey?: string;
  model?: string;
}

// OWASP A02: URL backend depuis variable d'env uniquement
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// Helper interne — appel Hono avec auth service-to-service (OWASP A01)
// Le secret n'est jamais exposé côté client : ce module est server-only
async function serverFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  // OWASP A09: trace structurée de chaque appel API côté Next.js server
  console.info('[ServerAPI] Appel:', {
    method: options?.method ?? 'GET',
    path,
    userId: session.user.id,
    apiUrl: API_URL,
    timestamp: new Date().toISOString(),
  });

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // OWASP A01: secret partagé validé par le middleware Hono
      'x-internal-secret': process.env['SERVICE_SECRET'] ?? '',
      'x-user-id': session.user.id,
      'x-user-email': session.user.email ?? '',
      'x-user-name': session.user.name ?? '',
      ...(options?.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      statusCode?: number;
    };
    // OWASP A09: logger l'erreur API complète côté Next.js server (visible dans les logs Vercel)
    console.error('[ServerAPI] Erreur réponse API:', {
      url: `${API_URL}${path}`,
      status: response.status,
      statusText: response.statusText,
      apiError: err,
      timestamp: new Date().toISOString(),
    });
    throw new Error(err.message ?? `Erreur API: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const serverApi = {
  generateWorkout: (input: GenerateWorkoutInput): Promise<WorkoutDetail> =>
    serverFetch<WorkoutDetail>('/workouts/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

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

  getWorkout: (id: string): Promise<WorkoutDetail> =>
    serverFetch<WorkoutDetail>(`/workouts/${id}`),

  deleteWorkout: (id: string): Promise<void> =>
    serverFetch<void>(`/workouts/${id}`, { method: 'DELETE' }),

  // --- Programmes multi-semaines ---

  generateProgram: (input: GenerateProgramInput): Promise<ProgramListItem> =>
    serverFetch<ProgramListItem>('/programs/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

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

  // --- Paramètres IA ---

  createSessionLog: (input: CreateSessionLogInput): Promise<SessionLogListItem> =>
    serverFetch<SessionLogListItem>('/session-logs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getSessionLogStats: (): Promise<SessionLogStats> =>
    serverFetch<SessionLogStats>('/session-logs/stats'),

  getRecentSessionLogs: (limit = 5): Promise<{ sessionLogs: SessionLogListItem[] }> =>
    serverFetch<{ sessionLogs: SessionLogListItem[] }>(`/session-logs/recent?limit=${limit}`),

  getAiSettings: (): Promise<UserAiSettings> =>
    serverFetch<UserAiSettings>('/settings'),

  saveAiSettings: (input: SaveAiSettingsInput): Promise<{ ok: boolean }> =>
    serverFetch<{ ok: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteAiKey: (): Promise<{ ok: boolean }> =>
    serverFetch<{ ok: boolean }>('/settings/api-key', { method: 'DELETE' }),
};
