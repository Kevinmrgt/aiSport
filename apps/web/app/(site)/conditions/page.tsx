import Link from 'next/link';

export const metadata = { title: 'Conditions d’utilisation - Alcide' };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-6 text-zinc-100" aria-labelledby="terms-title">
      <h1 id="terms-title" className="page-title">
        Conditions d’utilisation
      </h1>
      <section className="space-y-3">
        <h2 className="text-2xl font-black">Service et public</h2>
        <p>
          Alcide propose à des adultes des idées d’entraînement sportif générées par IA, un minuteur
          et un historique personnel. La version présentée est en évaluation privée ; une ouverture
          publique dépend de sa qualification finale. Aucun abonnement ou paiement n’est proposé
          dans cette version.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-black">Prudence et limites</h2>
        <p>
          Les contenus générés peuvent comporter des erreurs ou être inadaptés. Vérifiez chaque
          proposition et adaptez l’activité à vos capacités. Ce service ne fournit ni diagnostic, ni
          traitement, ni programme de rééducation et ne remplace pas l’avis d’un professionnel. En
          cas de douleur ou de doute, interrompez l’activité et sollicitez un professionnel
          compétent.
        </p>
        <p>
          Ne saisissez pas d’informations médicales ni de données d’autres personnes. Les demandes
          hors périmètre peuvent être refusées et les générations sont limitées pour protéger la
          disponibilité du service.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-black">Compte et disponibilité</h2>
        <p>
          La connexion utilise votre compte Google. Vous pouvez exporter vos données et fermer le
          compte Alcide depuis votre espace. La suppression du compte Alcide ne supprime pas votre
          compte Google. La génération peut échouer ou être momentanément indisponible ; aucune
          disponibilité permanente ni résultat sportif n’est garanti.
        </p>
      </section>
      <p>
        Le responsable et le contact sont précisés dans les{' '}
        <Link href="/mentions-legales" className="underline">
          mentions légales
        </Link>
        . Consultez la{' '}
        <Link href="/confidentialite" className="underline">
          politique de confidentialité
        </Link>{' '}
        pour vos droits.
      </p>
    </article>
  );
}
