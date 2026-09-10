import type { Context } from 'hono';
import { getGenerationQuota } from '../services/generation-quota.service.js';

export async function handleGetGenerationQuota(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const quota =
    auth.accessMode === 'beta'
      ? await getGenerationQuota(auth.userId, auth.accessMode, auth.generationBalance)
      : await getGenerationQuota(auth.userId, auth.accessMode);
  return ctx.json(quota);
}
