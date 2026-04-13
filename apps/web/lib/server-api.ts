import 'server-only';
import { auth } from '@/lib/auth';
import type { WorkoutDetail, WorkoutListItem, GenerateWorkoutInput } from '@sportcoach/shared';

// OWASP A02: URL backend depuis variable d'env uniquement
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// Helper interne — appel Hono avec auth service-to-service (OWASP A01)
// Le secret n'est jamais exposé côté client : ce module est server-only
async function serverFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // OWASP A01: secret partagé validé par le middleware Hono
      'x-internal-secret': process.env['SERVICE_SECRET'] ?? '',
      'x-user-id': session.user.id,
      'x-user-email': session.user.email ?? '',
      ...(options?.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { message?: string };
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

  getWorkouts: (): Promise<WorkoutListItem[]> => serverFetch<WorkoutListItem[]>('/workouts'),

  getWorkout: (id: string): Promise<WorkoutDetail> =>
    serverFetch<WorkoutDetail>(`/workouts/${id}`),

  deleteWorkout: (id: string): Promise<void> =>
    serverFetch<void>(`/workouts/${id}`, { method: 'DELETE' }),
};
