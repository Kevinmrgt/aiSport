import type { WorkoutDetail, WorkoutListItem } from '@alcide/shared';
import type { GenerateWorkoutInput } from '@alcide/shared';

// OWASP A02: l'URL du backend vient d'une variable d'env
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// Client HTTP vers le backend Hono
// Toujours passer le token de session pour l'auth (OWASP A01)

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { sessionToken?: string },
): Promise<T> {
  const { sessionToken, ...fetchOptions } = options ?? {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // OWASP A01: transmettre le token de session au backend
  if (sessionToken) {
    headers['x-session-token'] = sessionToken;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message ?? `Erreur API: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function generateWorkout(
  input: GenerateWorkoutInput,
  sessionToken: string,
): Promise<WorkoutDetail> {
  return apiFetch<WorkoutDetail>('/workouts/generate', {
    method: 'POST',
    body: JSON.stringify(input),
    sessionToken,
  });
}

export async function getWorkouts(sessionToken: string): Promise<WorkoutListItem[]> {
  return apiFetch<WorkoutListItem[]>('/workouts', { sessionToken });
}

export async function getWorkout(id: string, sessionToken: string): Promise<WorkoutDetail> {
  return apiFetch<WorkoutDetail>(`/workouts/${id}`, { sessionToken });
}

export async function deleteWorkout(id: string, sessionToken: string): Promise<void> {
  await apiFetch(`/workouts/${id}`, { method: 'DELETE', sessionToken });
}
