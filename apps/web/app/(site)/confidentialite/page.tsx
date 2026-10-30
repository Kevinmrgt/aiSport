import type { Metadata } from 'next';
import Link from 'next/link';
import { GlassPanel } from '@/components/PremiumPrimitives';
import { legalInformation } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Confidentialité - Alcide',
  description: 'Données personnelles, conservation et droits dans Alcide.',
};

export default function PrivacyPage() {
  const legal = legalInformation();
  return (
    <article className="mx-auto max-w-4xl space-y-6" aria-labelledby="privacy-title">
      <h1 id="privacy-title" className="page-title">
        Confidentialité
      </h1>
      {!legal.ready && (
        <p className="rounded-xl border border-amber-300/40 bg-zinc-950 p-4 text-zinc-100">
          Cette version est en évaluation privée. Les informations du responsable et de
          l’hébergement doivent être finalisées avant ouverture publique.
        </p>
      )}
      <GlassPanel className="space-y-7 p-5 sm:p-8">
        <section aria-labelledby="privacy-owner">
          <h2 id="privacy-owner" className="text-2xl font-black text-white">
            Responsable et contact
          </h2>
          <p className="muted-copy">
            {legal.operator ??
              'Responsable du service : information à compléter avant ouverture publique.'}
          </p>
          {legal.email ? (
            <p className="muted-copy">
              Pour toute question ou demande concernant vos données :{' '}
              <a className="underline" href={'mailto:' + legal.email}>
                {legal.email}
              </a>
              .
            </p>
          ) : (
            <p className="muted-copy">
              Le contact public doit être renseigné. Pendant l’évaluation privée, utilisez le canal
              qui vous a transmis l’accès ; ne publiez pas de données personnelles dans une issue
              publique.
            </p>
          )}
        </section>
        <section aria-labelledby="privacy-data">
          <h2 id="privacy-data" className="text-2xl font-black text-white">
            Données et finalités
          </h2>
          <ul className="muted-copy list-disc space-y-2 pl-5">
            <li>Identifiant Google stable, nom et e-mail : connexion et rattachement du compte.</li>
            <li>
              Sport, niveau, objectifs et contraintes non médicales : génération de séances et
              programmes, conservés dans votre historique.
            </li>
            <li>
              Durée, effort perçu, ressenti et notes de séance : journal et progression. Les notes
              de suivi ne sont pas envoyées à OpenAI.
            </li>
            <li>
              Événements techniques de génération et compteurs de consommation : disponibilité,
              prévention des abus et maîtrise des coûts, sans conservation du texte des prompts dans
              ces événements.
            </li>
          </ul>
          <p className="muted-copy">
            Base légale des traitements :{' '}
            {legal.basis ??
              'qualification à finaliser par le responsable avant ouverture publique.'}
          </p>
          <p className="muted-copy">
            Google assure la connexion, Vercel héberge les services, PostgreSQL/Neon conserve les
            données et OpenAI reçoit les informations de la demande de génération. N’inscrivez pas
            de données de santé, d’autres personnes ou de documents confidentiels dans les champs
            libres.
          </p>
          <p className="muted-copy">
            Régions, transferts et garanties des prestataires :{' '}
            {legal.transfers ??
              'informations des comptes et contrats à vérifier et compléter avant ouverture publique.'}
          </p>
        </section>
        <section aria-labelledby="privacy-health">
          <h2 id="privacy-health" className="text-2xl font-black text-white">
            Périmètre sportif
          </h2>
          <p className="muted-copy">
            Cette version ne collecte plus de nouvelles notes de douleur. Les demandes médicales
            sont hors périmètre ; les filtres automatiques ne sont pas infaillibles. Alcide ne
            remplace pas un diagnostic ni un professionnel de santé. D’anciennes notes
            éventuellement présentes restent incluses dans l’export et l’effacement du compte.
          </p>
        </section>
        <section aria-labelledby="privacy-retention">
          <h2 id="privacy-retention" className="text-2xl font-black text-white">
            Conservation et effacement
          </h2>
          <p className="muted-copy">
            La politique technique proposée prévoit l’effacement des comptes après{' '}
            {legal.retentionDays} jours sans activité. Elle doit être validée par le responsable et
            sa mise en œuvre régulière vérifiée avant ouverture. Vous pouvez supprimer votre compte
            plus tôt depuis « Mon coach » : profil, séances, programmes, journaux et notes sont
            alors effacés de la base active.
          </p>
          <p className="muted-copy">
            Supprimer une séance seule conserve son journal dans votre historique. Après suppression
            du compte, un identifiant transformé et une date sont conservés pour une durée prévue de
            35 jours, avec purge lors de la maintenance pour empêcher ses anciennes sessions de le
            recréer. Les sauvegardes suivent leur propre durée, à documenter ; un effacement doit
            être réappliqué avant remise en service d’une restauration.
          </p>
        </section>
        <section aria-labelledby="privacy-rights">
          <h2 id="privacy-rights" className="text-2xl font-black text-white">
            Vos droits
          </h2>
          <p className="muted-copy">
            Vous pouvez demander l’accès, la rectification, l’effacement, la limitation et,
            lorsqu’ils s’appliquent, l’opposition et la portabilité. Votre espace propose un export
            structuré et une suppression du compte. Pour toute autre demande, contactez le
            responsable ; une vérification proportionnée de l’identité peut être nécessaire. Une
            réponse doit normalement intervenir sous un mois, avec prolongation motivée dans les cas
            prévus.
          </p>
          <p className="muted-copy">
            Vous pouvez introduire une réclamation auprès de la{' '}
            <a href="https://www.cnil.fr/fr/plaintes" className="underline">
              CNIL
            </a>
            .
          </p>
          <Link href="/settings" className="action-secondary inline-flex">
            Gérer mes données
          </Link>
        </section>
        <section aria-labelledby="privacy-cookies">
          <h2 id="privacy-cookies" className="text-2xl font-black text-white">
            Cookies et session
          </h2>
          <p className="muted-copy">
            La connexion utilise des cookies techniques Auth.js nécessaires à la session et à sa
            sécurité, dont la session expire après 30 jours. Aucun outil publicitaire n’est intégré
            dans le candidat examiné. L’inventaire du déploiement final doit être confirmé avant
            ouverture.
          </p>
        </section>
        <p className="text-xs text-zinc-200">
          Mise à jour : 29 octobre 2026.{' '}
          <Link href="/mentions-legales" className="underline">
            Mentions légales
          </Link>{' '}
          ·{' '}
          <Link href="/conditions" className="underline">
            Conditions d’utilisation
          </Link>
        </p>
      </GlassPanel>
    </article>
  );
}
