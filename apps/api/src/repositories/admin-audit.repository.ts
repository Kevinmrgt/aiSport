import { sql } from 'drizzle-orm';
import type { db } from '../db/index.js';

export type AdminTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export interface AuditInput {
  actorEmail: string;
  userId?: string | null;
  targetEmail?: string | null;
  action: string;
  reason: string;
  changes: Record<string, unknown>;
  requestKey?: string | null;
}

// Call inside the transaction that performs the mutation. Only explicit, non-secret fields belong here.
export async function writeAdminAudit(tx: AdminTransaction, input: AuditInput): Promise<void> {
  await tx.execute(sql`INSERT INTO admin_audit_events(actor_email,user_id,target_email,action,reason,changes,request_key)
    VALUES (${input.actorEmail},${input.userId ?? null}::uuid,${input.targetEmail ?? null},${input.action},
      ${input.reason},${JSON.stringify(input.changes)}::jsonb,${input.requestKey ?? null})`);
}
