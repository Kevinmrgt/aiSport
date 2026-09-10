import 'server-only';
import { z } from 'zod';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

const API_URL = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export interface BetaAuthUser {
  id: string;
  email: string;
  name: string;
  betaSessionVersion: string;
  betaMustChangePassword: boolean;
}

export async function verifyBetaCredentials(credentials: unknown): Promise<BetaAuthUser | null> {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;
  try {
    const response = await fetch(`${API_URL}/auth/beta/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env['SERVICE_SECRET'] ?? '',
      },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const user = (await response.json()) as BetaAuthUser;
    return typeof user.id === 'string' && typeof user.betaSessionVersion === 'string' ? user : null;
  } catch {
    return null;
  }
}
