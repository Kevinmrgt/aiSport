import type { Context } from 'hono';
import { recordPageVisit } from '../repositories/visitor-analytics.repository.js';

export async function handleRecordPageVisit(ctx: Context): Promise<Response> {
  await recordPageVisit();
  ctx.header('Cache-Control', 'no-store, max-age=0');
  return ctx.body(null, 204);
}
