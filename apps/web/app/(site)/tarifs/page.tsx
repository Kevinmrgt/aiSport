import type { Metadata } from 'next';
import { BillingOffers } from '@/components/BillingOffers';
import { GlassPanel } from '@/components/PremiumPrimitives';

export const metadata: Metadata = { title: 'Les offres — Alcide' };

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-8 pb-8" aria-labelledby="pricing-title">
      <header className="page-heading !block">
        <p className="section-kicker mb-3">Un pas de plus vers vos objectifs</p>
        <h1 id="pricing-title" className="page-title">
          Choisissez votre rythme
        </h1>
        <p className="muted-copy mt-4 max-w-2xl">
          Commencez gratuitement. Passez à Premium quand votre entraînement prend de l’élan.
        </p>
      </header>
      <p className="premium-chip w-fit">Paiements de test · aucun prélèvement réel</p>
      <BillingOffers />
      <GlassPanel variant="soft" className="panel-padding">
        <h2 className="panel-title">Des crédits simples à comprendre</h2>
        <p className="muted-copy mt-4">
          Une séance coûte 1 crédit. Un programme coûte 1 crédit par semaine : un programme de 4
          semaines utilise 4 crédits. L’historique et le timer restent accessibles après utilisation
          de vos crédits.
        </p>
        <p className="muted-copy mt-3">
          Les 3 crédits de bienvenue sont offerts une seule fois et restent disponibles. Les crédits
          Premium sont utilisés en priorité et expirent à la fin du mois payé, sans report. Une
          génération qui échoue vous restitue ses crédits.
        </p>
      </GlassPanel>
    </section>
  );
}
