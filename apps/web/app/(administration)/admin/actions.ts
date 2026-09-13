'use server';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import {
  AdminBetaCreateSchema,
  AdminBetaAdjustmentSchema,
  AdminBetaStatusSchema,
  AdminGrantSchema,
  AdminReasonSchema,
  AdminSettingsSchema,
  AdminSuspensionSchema,
} from '@alcide/shared';
import { adminApi, adminFetch } from '@/lib/admin-api';
import { requireAdmin } from '@/lib/admin';
export interface AdminActionResult {
  error?: string;
  temporaryPassword?: string;
  userId?: string;
  success?: boolean;
}
const operations = z.enum([
  'beta.create',
  'beta.credits',
  'beta.status',
  'beta.reset',
  'beta.delete',
  'member.suspension',
  'credits.grant',
  'settings.model',
  'settings.balance',
]);
export async function performAdminAction(
  operation: string,
  form: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();
  const action = operations.safeParse(operation);
  if (!action.success) return { error: 'Action inconnue.' };
  const string = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value.trim() : '';
  };
  const userId = string('userId');
  if (
    !['beta.create', 'settings.model', 'settings.balance'].includes(action.data) &&
    !z.string().uuid().safeParse(userId).success
  )
    return { error: 'Membre invalide.' };
  const validate = <T>(schema: z.ZodType<T>, input: unknown): T => schema.parse(input);
  try {
    let result: AdminActionResult = { success: true };
    switch (action.data) {
      case 'beta.create': {
        const input = validate(AdminBetaCreateSchema, {
          name: string('name'),
          email: string('email'),
          generationBalance: Number(string('generationBalance')),
        });
        const created = await adminFetch<{ userId: string; temporaryPassword: string }>(
          '/beta-testers',
          { method: 'POST', body: JSON.stringify(input) },
        );
        result = { success: true, ...created };
        break;
      }
      case 'beta.credits': {
        const input = validate(AdminBetaAdjustmentSchema, {
          amount: Number(string('amount')),
          reason: string('reason'),
          requestId: string('requestId'),
        });
        await adminFetch(`/beta-testers/${userId}/credits`, {
          method: 'POST',
          body: JSON.stringify(input),
        });
        break;
      }
      case 'beta.status': {
        const input = validate(AdminBetaStatusSchema, {
          active: string('active') === 'true',
          reason: string('reason'),
        });
        await adminFetch(`/beta-testers/${userId}/status`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
        break;
      }
      case 'beta.reset':
      case 'beta.delete': {
        const reason = validate(AdminReasonSchema, string('reason'));
        const response = await adminFetch<{ temporaryPassword?: string }>(
          `/beta-testers/${userId}${action.data === 'beta.reset' ? '/password-reset' : ''}`,
          {
            method: action.data === 'beta.reset' ? 'POST' : 'DELETE',
            body: JSON.stringify({ reason }),
          },
        );
        result = { success: true, ...response };
        break;
      }
      case 'member.suspension': {
        const input = validate(AdminSuspensionSchema, {
          suspended: string('suspended') === 'true',
          reason: string('reason'),
        });
        await adminFetch(`/members/${userId}/suspension`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
        break;
      }
      case 'credits.grant': {
        const input = validate(AdminGrantSchema, {
          amount: Number(string('amount')),
          reason: string('reason'),
          requestId: string('requestId'),
        });
        await adminFetch(`/members/${userId}/credits`, {
          method: 'POST',
          body: JSON.stringify(input),
        });
        break;
      }
      case 'settings.model':
      case 'settings.balance': {
        const current = await adminApi.settings();
        const input = validate(AdminSettingsSchema, {
          ...current.settings,
          ...(action.data === 'settings.model'
            ? { defaultAiModel: string('defaultAiModel') }
            : { defaultBetaGenerationBalance: Number(string('defaultBetaGenerationBalance')) }),
        });
        await adminFetch('/platform-settings', { method: 'PUT', body: JSON.stringify(input) });
        break;
      }
    }
    revalidatePath('/admin', 'layout');
    return result;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError)
      return {
        error:
          'Vérifiez les champs : le motif doit contenir au moins 3 caractères et les montants doivent être des nombres entiers valides.',
      };
    return { error: error instanceof Error ? error.message : 'Action impossible. Réessayez.' };
  }
}
