import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { GlassPanel } from '@/components/PremiumPrimitives';
import { BillingButton } from '@/components/BillingButton';
import { connectBillingGoogle } from './actions';

export const dynamic = 'force-dynamic';

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; checkout?: string }>;
}) {
  const session = await auth();
  const method = (session?.user as { authMethod?: string } | undefined)?.authMethod;
  const google = Boolean(session?.user) && method !== 'jury' && method !== 'beta';
  const query = await searchParams;
  let status;
  let unavailable = false;
  let syncPending = false;
  if (google) {
    if (query.session_id && /^cs_test_[a-zA-Z0-9]+$/.test(query.session_id)) {
      try {
        await serverApi.syncCheckout(query.session_id);
      } catch {
        syncPending = true;
      }
    }
    try {
      status = await serverApi.getBillingStatus();
    } catch {
      unavailable = true;
    }
  }
  const date = status?.periodEnd
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(
        new Date(status.periodEnd),
      )
    : null;
  return (
    <section className="mx-auto max-w-3xl space-y-6 pb-8" aria-labelledby="subscription-title">
      <header className="page-heading !block">
        <p className="section-kicker mb-3">Votre espace</p>
        <h1 id="subscription-title" className="page-title">
          Mon abonnement
        </h1>
      </header>
      <p className="premium-chip w-fit">Mode test · aucun prélèvement réel</p>
      {!google ? (
        <GlassPanel className="panel-padding">
          <h2 className="panel-title">Votre entraînement commence ici</h2>
          <p className="muted-copy my-5">
            Connectez-vous avec Google pour recevoir 3 crédits gratuits et accéder à Premium à 9,99
            € TTC par mois.
          </p>
          <form action={connectBillingGoogle}>
            <button className="action-primary" type="submit">
              Continuer avec Google
            </button>
          </form>
          {session?.user && (
            <p className="muted-copy mt-4">
              Votre accès {method === 'jury' ? 'jury' : 'bêta'} conserve son quota actuel.
            </p>
          )}
        </GlassPanel>
      ) : unavailable ? (
        <GlassPanel className="panel-padding">
          <p role="alert">Votre abonnement est momentanément indisponible.</p>
          <Link href="/abonnement" className="action-secondary mt-5">
            Réessayer
          </Link>
        </GlassPanel>
      ) : (
        status && (
          <>
            {query.checkout === 'cancelled' && (
              <p role="status" className="muted-copy">
                Le paiement a été interrompu. Vous pouvez reprendre quand vous le souhaitez.
              </p>
            )}
            {query.session_id && (
              <p role="status" className="muted-copy">
                {status.plan === 'premium' && !syncPending
                  ? 'Votre abonnement Premium est actif.'
                  : 'La confirmation du paiement est en cours. Actualisez dans quelques instants.'}
              </p>
            )}
            <GlassPanel className="panel-padding">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="panel-title">
                  {status.plan === 'premium' ? 'Alcide Premium' : 'Alcide Découverte'}
                </h2>
                <span className="premium-chip">
                  {status.plan === 'premium' ? '9,99 € TTC / mois' : 'Gratuit'}
                </span>
              </div>
              <p className="mt-8">
                <span className="text-6xl font-black text-primary-100">{status.remaining}</span>
                <span className="muted-copy ml-3">crédits disponibles</span>
              </p>
              <p className="muted-copy mt-3">
                {status.freeCredits} crédit{status.freeCredits > 1 ? 's' : ''} de bienvenue
                {status.plan === 'premium' ? ` · ${status.premiumCredits} crédits Premium` : ''}
              </p>
              {status.plan === 'premium' && date && (
                <p className="muted-copy mt-4">
                  {status.cancelAtPeriodEnd
                    ? 'Résiliation programmée : accès Premium jusqu’au'
                    : 'Fin de la période de crédits et prochain renouvellement le'}{' '}
                  {date}.
                </p>
              )}
              {['past_due', 'unpaid', 'incomplete'].includes(status.subscriptionStatus ?? '') && (
                <p role="alert" className="mt-4 text-sport-orange">
                  Un paiement reste à régulariser. Mettez à jour votre moyen de paiement dans votre
                  espace Stripe.
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/generate" className="action-secondary">
                  Créer une séance
                </Link>
                {status.canManage && (
                  <BillingButton kind="portal">Gérer mon abonnement</BillingButton>
                )}
              </div>
            </GlassPanel>
            {status.canSubscribe && (
              <GlassPanel className="panel-padding">
                <p className="section-kicker">Allez plus loin</p>
                <h2 className="panel-title mt-3">30 crédits par mois, votre rythme en plus</h2>
                <p className="muted-copy my-5">
                  Premium : 9,99 € TTC par mois, renouvellement automatique. Résiliation à tout
                  moment pour la fin de la période payée. Les crédits mensuels expirent sans report.
                </p>
                <BillingButton kind="checkout">Passer à Premium · 9,99 € / mois</BillingButton>
              </GlassPanel>
            )}
          </>
        )
      )}
      <Link href="/tarifs" className="inline-flex text-sm underline underline-offset-4">
        Comparer les offres et comprendre les crédits
      </Link>
    </section>
  );
}
