'use client';

import { useState } from 'react';
import { openBilling } from '@/app/abonnement/actions';
import { Icon } from './ui/Icon';

export function BillingButton({
  kind,
  children,
}: {
  kind: 'checkout' | 'portal';
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className={kind === 'checkout' ? 'action-primary w-full' : 'action-secondary'}
        disabled={pending}
        onClick={() => {
          void (async () => {
            if (pending) return;
            setPending(true);
            setError(null);
            try {
              const result = await openBilling(kind);
              if (!result.url) {
                setError(result.error ?? 'Impossible d’ouvrir le paiement.');
                return;
              }
              const url = new URL(result.url);
              if (
                url.protocol !== 'https:' ||
                !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)
              ) {
                setError('Adresse de paiement invalide.');
                return;
              }
              window.location.assign(url.href);
            } catch {
              setError('Connexion interrompue. Veuillez réessayer.');
            } finally {
              setPending(false);
            }
          })();
        }}
      >
        {pending ? 'Ouverture…' : children}
        <Icon name="arrow-right" className="h-4 w-4" />
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-sport-orange">
          {error}
        </p>
      )}
    </div>
  );
}
