'use server';

import { auth, signIn } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';

export async function connectBillingGoogle() {
  await signIn('google', { redirectTo: '/abonnement' });
}

export async function openBilling(
  kind: 'checkout' | 'portal',
): Promise<{ url?: string; error?: string }> {
  const session = await auth();
  const method = (session?.user as { authMethod?: string } | undefined)?.authMethod;
  if (!session?.user || method === 'jury' || method === 'beta') {
    return { error: 'Connectez-vous avec Google pour gérer votre abonnement.' };
  }
  if (kind !== 'checkout' && kind !== 'portal') return { error: 'Action invalide.' };
  try {
    return kind === 'checkout'
      ? await serverApi.createCheckout()
      : await serverApi.createBillingPortal();
  } catch {
    return {
      error:
        'Le paiement est momentanément indisponible. Actualisez la page ou réessayez dans quelques instants.',
    };
  }
}
