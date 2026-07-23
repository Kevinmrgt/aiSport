import type { GenerationQuota } from '@alcide/shared';

interface GenerationQuotaNoticeProps {
  quota: GenerationQuota;
}

export function GenerationQuotaNotice({ quota }: GenerationQuotaNoticeProps) {
  if (!quota.limited) return null;

  const exhausted = quota.remaining === 0;
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
      <strong>Acces jury :</strong> {remaining} generation{remaining === 1 ? '' : 's'} restante
      {remaining === 1 ? '' : 's'} sur {quota.limit}. Le quota est partage entre les seances et les
      programmes.
    </div>
  );
}
