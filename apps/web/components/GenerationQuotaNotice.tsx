import type { GenerationQuota } from '@alcide/shared';
import Link from 'next/link';

interface GenerationQuotaNoticeProps {
  quota: GenerationQuota;
  cost?: number;
}

export function GenerationQuotaNotice({ quota, cost = 1 }: GenerationQuotaNoticeProps) {
  if (!quota.limited) return null;

  const exhausted = (quota.remaining ?? 0) < cost;
  const remaining = quota.remaining ?? 0;

  return (
    <div
      role={exhausted ? 'alert' : 'status'}
      aria-live="polite"
      className={`rounded-[1.25rem] border p-4 text-sm ${
        exhausted
          ? 'border-sport-orange/30 bg-sport-orange/10 text-sport-orange'
          : 'border-primary-300/25 bg-primary-300/10 text-primary-100'
      }`}
    >
      {quota.mode === 'standard' ? (
        <>
          <strong>{quota.plan === 'premium' ? 'Premium' : 'Découverte'} :</strong> {remaining} crédit{remaining>1?'s':''} disponible{remaining>1?'s':''}. Cette génération coûte {cost} crédit{cost>1?'s':''}.
          <Link href="/abonnement" className="ml-2 underline underline-offset-4">{exhausted ? 'Voir mon abonnement' : 'Gérer mes crédits'}</Link>
        </>
      ) : quota.mode === 'beta' ? (
        <>
          <strong>Accès bêta :</strong> {remaining} génération{remaining === 1 ? '' : 's'} disponible
          {remaining === 1 ? '' : 's'}.
        </>
      ) : (
        <>
          <strong>Acces jury :</strong> {remaining} generation{remaining === 1 ? '' : 's'} restante
          {remaining === 1 ? '' : 's'} sur {quota.limit}.
        </>
      )}{' '}
      {quota.mode !== 'standard' && 'Le quota est partagé entre les séances et les programmes.'}
    </div>
  );
}
