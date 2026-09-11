import type { Metadata } from 'next';
import Link from 'next/link';
import { GlassPanel } from '@/components/PremiumPrimitives';

export const metadata: Metadata = {
  title: 'Confidentialité - Alcide',
  description: 'Informations sur les données personnelles traitées par le prototype Alcide.',
};

export default function PrivacyPage() {
  return (
    <article className="space-y-8" aria-labelledby="privacy-title">
      <header className="page-heading block">
        <h1 id="privacy-title" className="page-title">
          Confidentialité
        </h1>
        <p className="muted-copy mt-4 max-w-3xl">
          Alcide est un prototype de coaching sportif. Cette page décrit les traitements réellement
          présents dans l&apos;application ; elle ne prétend pas offrir des fonctions encore
          absentes.
        </p>
      </header>

      <div className="privacy-layout">
        <nav className="privacy-nav" aria-label="Sommaire de confidentialité">
          <a href="#data-title">Données traitées</a>
          <a href="#purpose-title">Finalités</a>
          <a href="#sensitive-title">Notes de douleur</a>
          <a href="#retention-title">Conservation</a>
          <a href="#rights-title">Vos droits</a>
        </nav>
        <GlassPanel className="privacy-content panel-padding space-y-7">
          <section aria-labelledby="data-title">
            <h2 id="data-title" className="text-2xl font-black text-white">
              Données traitées
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-300">
              <li>identifiant, nom et adresse e-mail fournis lors de la connexion Google ;</li>
              <li>
                séances et programmes générés, objectifs, sport, niveau et contraintes saisies ;
              </li>
              <li>
                journaux de séance : durée, effort perçu, ressenti, notes libres et éventuelles
                notes de douleur ;
              </li>
              <li>dates de création et de réalisation nécessaires à l&apos;historique.</li>
              <li>
                nombre d&apos;ouvertures de pages par jour, agrégé sans identifiant, adresse IP ni
                adresse de page détaillée.
              </li>
            </ul>
          </section>

          <section aria-labelledby="purpose-title">
            <h2 id="purpose-title" className="text-2xl font-black text-white">
              Finalités et destinataires
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Ces données servent à authentifier le compte, générer et conserver les entraînements,
              afficher la progression et enregistrer le ressenti. Google intervient pour la
              connexion, l&apos;infrastructure PostgreSQL conserve les données applicatives et
              OpenAI traite les informations envoyées lors d&apos;une demande de génération. Les
              notes de suivi ne sont pas envoyées à OpenAI par le parcours actuel.
            </p>
          </section>

          <section aria-labelledby="sensitive-title">
            <h2 id="sensitive-title" className="text-2xl font-black text-white">
              Notes de douleur
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Une note de douleur peut révéler une information sensible. Sa saisie est facultative :
              n&apos;indiquez que ce qui est utile au suivi sportif. Alcide ne remplace ni un
              diagnostic ni l&apos;avis d&apos;un professionnel de santé.
            </p>
          </section>

          <section aria-labelledby="retention-title">
            <h2 id="retention-title" className="text-2xl font-black text-white">
              Conservation actuelle
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Aucune durée de conservation automatique n&apos;est encore configurée dans ce
              prototype. Les données restent donc conservées en base tant qu&apos;elles ne sont pas
              supprimées par le responsable du projet. Ce point doit être défini avant toute mise en
              production réelle.
            </p>
          </section>

          <section aria-labelledby="rights-title">
            <h2 id="rights-title" className="text-2xl font-black text-white">
              Vos droits et contact
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données,
              ainsi que la limitation du traitement. L&apos;application ne propose pas encore
              d&apos;export du compte ni de suppression globale en libre-service. Contactez le
              responsable du projet par le canal privé qui vous a transmis l&apos;accès à Alcide.
              Aucune adresse de contact dédiée n&apos;est actuellement publiée ; ne placez pas de
              donnée sensible dans une issue publique.
            </p>
          </section>

          <p className="border-t border-white/10 pt-5 text-xs text-zinc-200">
            Information mise à jour le 11 septembre 2026. Pour revenir au service, consultez{' '}
            <Link href="/" className="font-bold text-primary-300 underline underline-offset-4">
              l&apos;accueil Alcide
            </Link>
            .
          </p>
        </GlassPanel>
      </div>
    </article>
  );
}
