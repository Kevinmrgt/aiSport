import Link from 'next/link';
import { BILLING_OFFER } from '@alcide/shared';
import { GlassPanel } from './PremiumPrimitives';
import { Icon } from './ui/Icon';

export function BillingOffers() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <GlassPanel className="panel-padding flex flex-col">
        <div className="flex min-h-9 items-center">
          <p className="section-kicker">Pour commencer</p>
        </div>
        <h2 className="panel-title mt-3">Découverte</h2>
        <p className="my-7 text-5xl font-black tracking-tight">0 €</p>
        <p className="muted-copy">
          Trouvez votre rythme avec {BILLING_OFFER.freeCredits} crédits offerts à votre première
          connexion Google.
        </p>
        <ul className="my-7 space-y-3 text-sm">
          <li className="flex gap-3">
            <Icon name="spark" className="h-5 w-5 shrink-0 text-primary-200" />
            Séances et programmes personnalisés
          </li>
          <li className="flex gap-3">
            <Icon name="timer" className="h-5 w-5 shrink-0 text-primary-200" />
            Timer, historique et suivi inclus
          </li>
          <li className="flex gap-3">
            <Icon name="user" className="h-5 w-5 shrink-0 text-primary-200" />
            Sans carte bancaire
          </li>
        </ul>
        <Link href="/abonnement" className="action-secondary mt-auto">
          Commencer avec Google
        </Link>
      </GlassPanel>
      <GlassPanel className="panel-padding flex flex-col border-primary-300/40">
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
          <p className="section-kicker">Pour progresser</p>
          <span className="premium-chip">Premium</span>
        </div>
        <h2 className="panel-title mt-3">Premium</h2>
        <p className="my-7">
          <span className="text-5xl font-black tracking-tight text-primary-100">9,99 €</span>
          <span className="muted-copy ml-2">TTC / mois</span>
        </p>
        <p className="muted-copy">
          {BILLING_OFFER.premiumCredits} crédits chaque mois pour construire un entraînement qui
          vous ressemble.
        </p>
        <ul className="my-7 space-y-3 text-sm">
          <li className="flex gap-3">
            <Icon name="zap" className="h-5 w-5 shrink-0 text-primary-200" />
            30 crédits par période mensuelle payée
          </li>
          <li className="flex gap-3">
            <Icon name="layers" className="h-5 w-5 shrink-0 text-primary-200" />
            Toutes les fonctions de Découverte
          </li>
          <li className="flex gap-3">
            <Icon name="user" className="h-5 w-5 shrink-0 text-primary-200" />
            Résiliable avant le prochain renouvellement
          </li>
        </ul>
        <Link href="/abonnement" className="action-primary mt-auto">
          Découvrir Premium <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      </GlassPanel>
    </div>
  );
}
