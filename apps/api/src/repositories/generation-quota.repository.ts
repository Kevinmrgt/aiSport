import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { generationQuotas, trainingPrograms, workouts } from '../db/schema.js';

export interface ReservedGenerationQuota {
  used: number;
  remaining: number;
}

async function ensureQuotaRow(userId: string, limit: number): Promise<void> {
  // Lors de la premiere activation, les generations deja conservees sont
  // integrees au compteur. Ensuite le compteur ne diminue plus lors d'une suppression.
  await db.execute(sql`
    INSERT INTO ${generationQuotas} (
      ${generationQuotas.userId},
      ${generationQuotas.usedCount}
    )
    SELECT
      CAST(${userId} AS uuid),
      LEAST(
        ${limit},
        (
          (SELECT COUNT(*) FROM ${workouts} WHERE ${workouts.userId} = CAST(${userId} AS uuid))
          +
          (SELECT COUNT(*) FROM ${trainingPrograms} WHERE ${trainingPrograms.userId} = CAST(${userId} AS uuid))
        )
      )::integer
    ON CONFLICT (${generationQuotas.userId}) DO NOTHING
  `);
}

export async function getGenerationQuotaUsage(userId: string, limit: number): Promise<number> {
  await ensureQuotaRow(userId, limit);
  const [row] = await db
    .select({ used: generationQuotas.usedCount })
    .from(generationQuotas)
    .where(eq(generationQuotas.userId, userId))
    .limit(1);

  return row?.used ?? 0;
}

export async function reserveGenerationSlot(
  userId: string,
  limit: number,
): Promise<ReservedGenerationQuota | null> {
  await ensureQuotaRow(userId, limit);

  const [row] = await db
    .update(generationQuotas)
    .set({
      usedCount: sql`${generationQuotas.usedCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(generationQuotas.userId, userId), lt(generationQuotas.usedCount, limit)))
    .returning({ used: generationQuotas.usedCount });

  if (!row) return null;
  return { used: row.used, remaining: Math.max(0, limit - row.used) };
}

export async function releaseGenerationSlot(userId: string): Promise<void> {
  await db
    .update(generationQuotas)
    .set({
      usedCount: sql`GREATEST(${generationQuotas.usedCount} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(generationQuotas.userId, userId));
}
